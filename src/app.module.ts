import { Module } from '@nestjs/common';
import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { AppUpdate } from './app.update';
import { AppService } from './app.service';
import { MusicModule } from './music/music.module';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: './.env',
    }),
    NecordModule.forRoot({
      token:
        'MTMwOTIwNTQwNTM4OTI5MTU0MA.Gc9fJF.fmeGj0PC_9M8wZ90eg22n95qlXGsQdDFu6yojE',
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildVoiceStates,
      ],
      development: ['674273672524988440'],
    }),
    MusicModule,
  ],
  providers: [AppUpdate, AppService],
})
export class AppModule {}

//MTMwOTIwNTQwNTM4OTI5MTU0MA.Gc9fJF.fmeGj0PC_9M8wZ90eg22n95qlXGsQdDFu6yojE
