import { Module } from '@nestjs/common';
import { MusicService } from './music.service';
import { MusicCommands } from './music.commands';

@Module({
  providers: [MusicService, MusicCommands],
  exports: [MusicService],
})
export class MusicModule {}
