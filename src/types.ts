// ============================================================================
// TYPES.TS - Definice datových typů (interfaces)
// ============================================================================
// TypeScript používá "interfaces" k definici struktury objektů.
// Je to jako šablona/formulář - říká "objekt tohoto typu MUSÍ mít tyto vlastnosti".
// ============================================================================

// "import" = načti něco z jiného souboru nebo knihovny
// { TextChannel, VoiceChannel } = načítáme konkrétní věci z knihovny (ne všechno)
// "from" = odkud to načítáme
// "discord.js" = název knihovny pro práci s Discord API
import { TextChannel, VoiceChannel } from "discord.js";

// Podobně načítáme typy z knihovny pro hlasové kanály
import { AudioPlayer, VoiceConnection } from "@discordjs/voice";

// ============================================================================
// INTERFACE SONG - Struktura pro jednu písničku
// ============================================================================
// "export" = tuto definici můžeme použít v jiných souborech (importovat ji)
// "interface" = definice struktury objektu (jako formulář)
// "Song" = název tohoto typu (můžeme si ho pojmenovat jak chceme)
export interface Song {
  // "title" = název vlastnosti
  // ":" = odděluje název od typu
  // "string" = textový typ (řetězec znaků, např. "Hello World")
  title: string;

  // URL adresa videa na YouTube
  url: string;

  // Délka písničky jako text (např. "3:45")
  duration: string;

  // URL adresa náhledového obrázku
  thumbnail: string;
}

// ============================================================================
// INTERFACE GUILDQUEUE - Struktura fronty písniček pro jeden server
// ============================================================================
// "Guild" v Discord terminologii = server
// Každý server má svou vlastní frontu písniček
export interface GuildQueue {
  // Textový kanál kde bot odpovídá na příkazy
  // "TextChannel" = typ z discord.js knihovny
  textChannel: TextChannel;

  // Hlasový kanál kde bot hraje hudbu
  voiceChannel: VoiceChannel;

  // Připojení k hlasovému kanálu
  // "VoiceConnection | null" = může být buď VoiceConnection NEBO null
  // "|" = "nebo" (union type)
  // "null" = žádná hodnota, nic, prázdno
  connection: VoiceConnection | null;

  // Přehrávač audia
  // "AudioPlayer | null" = může být AudioPlayer nebo nic
  player: AudioPlayer | null;

  // Pole (array) písniček ve frontě
  // "Song[]" = pole objektů typu Song
  // "[]" za typem = je to pole (array) těchto věcí
  songs: Song[];

  // Jestli právě hraje hudba
  // "boolean" = pravda/nepravda (true/false)
  playing: boolean;

  // Loop mód: "off" = vypnuto, "song" = opakuj jednu písničku, "queue" = opakuj celou frontu
  // Toto je "union type" s konkrétními hodnotami (string literals)
  loopMode: "off" | "song" | "queue";
}
