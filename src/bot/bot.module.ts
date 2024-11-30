import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { NecordModule } from 'necord';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>('DISCORD_BOT_TOKEN'),
        intents: ['Guilds', 'GuildMessages', 'GuildVoiceStates'],
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [BotService],
})
export class BotModule {}
