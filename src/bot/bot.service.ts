/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import * as play from 'play-dl';
import {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  createAudioResource,
} from '@discordjs/voice';
import { GuildMember } from 'discord.js';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  @SlashCommand({
    name: 'ping',
    description: 'Ping-Pong Command',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({ content: 'Pong!' });
  }

  @SlashCommand({
    name: 'play',
    description: 'Play a song from YouTube',
  })
  async onPlayCommand(@Context() [interaction]: SlashCommandContext) {
    // Extract the query string directly from interaction options
    const query = interaction.options.getString('query');

    this.logger.debug(`Received query: ${query}`);

    if (!query || query.trim() === '') {
      await interaction.reply(
        'Please provide a valid search query or YouTube URL!',
      );
      return;
    }

    const guildMember = interaction.member as GuildMember;

    if (!guildMember || !guildMember.voice.channelId) {
      await interaction.reply(
        'You must be in a voice channel to use this command.',
      );
      return;
    }

    try {
      // Join the user's voice channel
      const connection = joinVoiceChannel({
        channelId: guildMember.voice.channelId,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      // Check if the query is a URL
      const isUrl = query.startsWith('http');
      this.logger.debug(`Is query a URL: ${isUrl}`);

      let streamInfo;

      if (isUrl) {
        streamInfo = await play.stream(query.trim());
      } else {
        const searchResults = await play.search(query.trim(), { limit: 1 });
        if (!searchResults.length) {
          await interaction.reply('Could not find any results for your query.');
          connection.destroy();
          return;
        }
        const result = searchResults[0];
        this.logger.debug(`Search result: ${JSON.stringify(result)}`);
        streamInfo = await play.stream(result.url);
      }

      const resource = createAudioResource(streamInfo.stream, {
        inputType: streamInfo.type,
      });

      const player = createAudioPlayer();
      player.play(resource);

      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => connection.destroy());

      await interaction.reply(`Now playing: ${query}`);
    } catch (error) {
      this.logger.error(`Error while handling /play command: ${error.message}`);
      await interaction.reply('There was an error playing the requested song.');
    }
  }
}
