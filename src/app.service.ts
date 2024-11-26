import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';

@Injectable()
export class AppService {
  @SlashCommand({
    name: 'ping',
    description: 'Replies with Pong!',
  })
  public async onPing(@Context() [interaction]: SlashCommandContext) {
    return interaction.reply({
      content: 'Pong!',
    });
  }
}
