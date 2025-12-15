import {
  AudioPlayer,
  VoiceConnection,
} from "@discordjs/voice";
import { TextChannel, VoiceChannel } from "discord.js";

export interface Song {
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
}

export interface GuildQueue {
  textChannel: TextChannel;
  voiceChannel: VoiceChannel;
  connection: VoiceConnection | null;
  player: AudioPlayer | null;
  songs: Song[];
  playing: boolean;
}
