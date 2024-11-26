/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  NoSubscriberBehavior,
  StreamType,
} from '@discordjs/voice';
import * as play from 'play-dl';
import * as ytdl from 'ytdl-core';
import { VoiceChannel } from 'discord.js';

interface Song {
  title: string;
  url: string;
}

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private queue = new Map<
    string,
    { songs: Song[]; player: any; connection: VoiceConnection }
  >();

  private ytdlOptions = {
    requestOptions: {
      headers: {},
    },
  };

  async onModuleInit() {
    if (process.env.YOUTUBE_COOKIE) {
      this.logger.debug(
        `Using YouTube cookie: ${process.env.YOUTUBE_COOKIE.slice(0, 20)}...`,
      );

      try {
        // Parse the cookie string to extract identity token
        const cookies = process.env.YOUTUBE_COOKIE.split(';').map((c) =>
          c.trim(),
        );
        const identityToken = cookies.find(
          (c) => c.startsWith('__Secure-3PSID=') || c.startsWith('SID='),
        );

        if (!identityToken) {
          this.logger.warn(
            'No YouTube identity token found in cookie. Authentication might fail.',
          );
        }

        // Set up play-dl with full cookie string
        await play.setToken({
          youtube: {
            cookie: process.env.YOUTUBE_COOKIE,
          },
        });

        this.logger.debug(
          'Successfully configured play-dl with YouTube cookie',
        );
      } catch (error) {
        this.logger.error(
          `Failed to set up YouTube authentication: ${error.message}`,
        );
      }
    }

    try {
      const testInfo = await play.video_info(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );
      this.logger.debug(
        `Test video info fetched: ${testInfo.video_details.title}`,
      );
    } catch (testError) {
      this.logger.error(
        `Failed to fetch video info during initialization: ${testError.message}`,
      );
    }
  }

  async createStream(
    url: string,
    isRetry = false,
  ): Promise<{ stream: any; type: StreamType }> {
    try {
      if (!isRetry) {
        // First try without cookie to handle public videos
        try {
          const stream = await play.stream(url);
          return {
            stream: stream.stream,
            type: stream.type as StreamType,
          };
        } catch (publicError) {
          this.logger.debug(
            'Public access failed, trying with authentication...',
          );
          // If public access fails, try with authentication (using the globally set cookie)
          const stream = await play.stream(url, {
            quality: 2,
          });
          return {
            stream: stream.stream,
            type: stream.type as StreamType,
          };
        }
      }
      throw new Error('Skipping play-dl on retry');
    } catch (playDlError) {
      this.logger.warn(
        `play-dl ${isRetry ? 'skipped' : 'failed'}: ${playDlError.message}`,
      );

      try {
        // For ytdl-core, try without cookies first
        const stream = ytdl(url, {
          filter: 'audioonly',
          quality: 'highestaudio',
          highWaterMark: 1 << 25,
          dlChunkSize: 0,
        });

        return {
          stream,
          type: StreamType.Arbitrary,
        };
      } catch (ytdlError) {
        // If that fails, try with cookies
        try {
          const stream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
            dlChunkSize: 0,
            requestOptions: {
              headers: {
                cookie: process.env.YOUTUBE_COOKIE,
              },
            },
          });

          return {
            stream,
            type: StreamType.Arbitrary,
          };
        } catch (authenticatedError) {
          this.logger.error(
            `ytdl-core failed with authentication: ${authenticatedError.message}`,
          );
          throw new Error('Failed to create audio stream');
        }
      }
    }
  }

  private async playNextSong(guildId: string) {
    const serverQueue = this.queue.get(guildId);
    if (!serverQueue || !serverQueue.songs.length) {
      if (serverQueue?.connection) {
        serverQueue.connection.destroy();
      }
      this.queue.delete(guildId);
      this.logger.debug('Queue is empty, destroyed connection');
      return;
    }

    const song = serverQueue.songs[0];
    this.logger.debug(`Attempting to play song: ${song.title}`);

    let currentAttempt = 0;
    const maxAttempts = 2;

    const attemptPlay = async (isRetry = false) => {
      try {
        const { stream, type } = await this.createStream(song.url, isRetry);

        const resource = createAudioResource(stream, {
          inputType: type,
          inlineVolume: true,
        });

        resource.volume?.setVolume(0.5);

        serverQueue.player.play(resource);
        serverQueue.connection.subscribe(serverQueue.player);

        return true;
      } catch (error) {
        this.logger.error(
          `Attempt ${currentAttempt + 1} failed: ${error.message}`,
        );
        return false;
      }
    };

    while (currentAttempt < maxAttempts) {
      const success = await attemptPlay(currentAttempt > 0);
      if (success) {
        break;
      }
      currentAttempt++;

      if (currentAttempt >= maxAttempts) {
        this.logger.error(
          `Failed to play song "${song.title}" after ${maxAttempts} attempts`,
        );
        serverQueue.songs.shift();
        this.playNextSong(guildId);
        return;
      }
    }

    // Handle song completion
    serverQueue.player.on(AudioPlayerStatus.Idle, () => {
      this.logger.debug(`Finished playing: ${song.title}`);
      serverQueue.songs.shift();
      this.playNextSong(guildId);
    });

    // Handle player errors
    serverQueue.player.on('error', async (error) => {
      this.logger.error(`Player error: ${error.message}`);
      // Skip the song if we encounter a player error
      serverQueue.songs.shift();
      this.playNextSong(guildId);
    });
  }

  async addSong(
    voiceChannel: VoiceChannel,
    guildId: string,
    query: string,
  ): Promise<string> {
    try {
      this.logger.debug(`Received query: ${query}`);
      const trimmedQuery = query.trim();
      this.logger.debug(`Trimmed query: ${trimmedQuery}`);

      if (!trimmedQuery) {
        throw new Error('Empty search query');
      }

      let song: Song;
      try {
        // Try to get video info without explicit authentication first
        // (play-dl will use the globally set cookie if needed)
        const videoInfo = await play.video_info(trimmedQuery);
        song = {
          title: videoInfo.video_details.title,
          url: videoInfo.video_details.url,
        };
      } catch (playDlError) {
        this.logger.warn(`play-dl failed: ${playDlError.message}`);
        if (ytdl.validateURL(trimmedQuery)) {
          // Try ytdl-core with authentication
          const videoInfo = await ytdl.getBasicInfo(trimmedQuery, {
            requestOptions: {
              headers: {
                cookie: process.env.YOUTUBE_COOKIE,
              },
            },
          });
          song = {
            title: videoInfo.videoDetails.title,
            url: videoInfo.videoDetails.video_url,
          };
        } else {
          const searchResults = await play.search(trimmedQuery, { limit: 1 });
          if (!searchResults || searchResults.length === 0) {
            throw new Error('No videos found');
          }
          const videoInfo = await play.video_info(searchResults[0].url);
          song = {
            title: videoInfo.video_details.title,
            url: videoInfo.video_details.url,
          };
        }
      }

      const serverQueue = this.queue.get(guildId);
      if (!serverQueue) {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        const player = createAudioPlayer({
          behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
        });
        this.queue.set(guildId, { songs: [song], player, connection });
        this.playNextSong(guildId);
        return `Now playing: **${song.title}**`;
      } else {
        serverQueue.songs.push(song);
        return `Added to queue: **${song.title}**`;
      }
    } catch (error) {
      this.logger.error(`Song addition error: ${error.message}`);
      throw new Error(`Unable to process the song: ${error.message}`);
    }
  }

  async stop(guildId: string): Promise<string> {
    const serverQueue = this.queue.get(guildId);
    if (!serverQueue) {
      return 'There is no music playing!';
    }

    serverQueue.player.stop();
    serverQueue.connection.destroy();
    this.queue.delete(guildId);
    return 'Stopped the music and cleared the queue.';
  }

  getQueue(guildId: string): string {
    const serverQueue = this.queue.get(guildId);
    if (!serverQueue || !serverQueue.songs.length) {
      return 'The queue is empty!';
    }

    return `**Queue:**\n${serverQueue.songs
      .map((s, i) => `${i + 1}. ${s.title}`)
      .join('\n')}`;
  }
}
