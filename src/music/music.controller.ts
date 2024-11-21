import { Controller } from '@nestjs/common';
import { MusicService } from './music.service';
import { CommandInteraction } from 'discord.js';
import { Context, Options, SlashCommand } from 'necord';

@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @SlashCommand({
    name: 'play',
    description: 'Play a song in your voice channel.',
  })
  async play(
    @Context() interaction: CommandInteraction,
    @Options() { query }: { query: string },
  ) {
    await this.musicService.play(interaction, query);
  }

  @SlashCommand({
    name: 'stop',
    description: 'Stop the music.',
  })
  async stop(@Context() interaction: CommandInteraction) {
    await this.musicService.stop(interaction);
  }

  @SlashCommand({
    name: 'queue',
    description: 'Show the music queue.',
  })
  async queue(@Context() interaction: CommandInteraction) {
    await this.musicService.showQueue(interaction);
  }
}
