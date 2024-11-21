import { Injectable } from '@nestjs/common';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { VoiceChannel, CommandInteraction } from 'discord.js';

interface Song {
  title: string;
  url: string;
}

@Injectable()
export class MusicService {
  private queue = new Map<string, { songs: Song[]; player: any }>();

  async play(interaction: CommandInteraction, query: string) {
    const member = interaction.member as any;
    const voiceChannel = member.voice.channel as VoiceChannel;

    if (!voiceChannel) {
      return interaction.reply('Please join a voice channel first!');
    }

    const songInfo = await ytdl.getInfo(query);
    const song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
    };

    const serverQueue = this.queue.get(interaction.guildId);

    if (!serverQueue) {
      const queueConstructor = {
        songs: [song],
        player: createAudioPlayer(),
      };

      this.queue.set(interaction.guildId, queueConstructor);

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const resource = createAudioResource(
        ytdl(song.url, { filter: 'audioonly' }),
      );

      queueConstructor.player.play(resource);
      connection.subscribe(queueConstructor.player);

      queueConstructor.player.on(AudioPlayerStatus.Idle, () => {
        queueConstructor.songs.shift();
        if (queueConstructor.songs.length) {
          this.playSong(queueConstructor.songs[0], queueConstructor.player);
        } else {
          connection.destroy();
          this.queue.delete(interaction.guildId);
        }
      });

      return interaction.reply(`Now playing: **${song.title}**`);
    } else {
      serverQueue.songs.push(song);
      return interaction.reply(`Added to queue: **${song.title}**`);
    }
  }

  async stop(interaction: CommandInteraction) {
    const serverQueue = this.queue.get(interaction.guildId);

    if (!serverQueue) {
      return interaction.reply('No music is playing!');
    }

    serverQueue.player.stop();
    this.queue.delete(interaction.guildId);
    return interaction.reply('Stopped the music.');
  }

  async showQueue(interaction: CommandInteraction) {
    const serverQueue = this.queue.get(interaction.guildId);

    if (!serverQueue) {
      return interaction.reply('The queue is empty!');
    }

    const queueMessage = serverQueue.songs
      .map((song, index) => `${index + 1}. ${song.title}`)
      .join('\n');
    return interaction.reply(`**Queue:**\n${queueMessage}`);
  }

  private playSong(song: Song, player: any) {
    const resource = createAudioResource(
      ytdl(song.url, { filter: 'audioonly' }),
    );
    player.play(resource);
  }
}
