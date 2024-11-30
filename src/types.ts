import {TextChannel, VoiceChannel} from "discord.js";
import {AudioResource,VoiceConnection} from "@discordjs/voice";

export interface Song {
    title: string;
    url: string;
}

export interface QueueConstructor {
    textChannel: TextChannel;
    voiceChannel: VoiceChannel;
    connection: VoiceConnection | null;
    songs: Song[];
    volume: number;
    playing: boolean;
    loopOne: boolean;
    loopAll: boolean;
}