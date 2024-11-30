import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [ConfigModule.forRoot(), BotModule],
  providers: [AppService],
})
export class AppModule {}
