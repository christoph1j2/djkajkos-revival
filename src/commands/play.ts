// src/commands/play.ts
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    VoiceChannel,
    TextChannel,
    GuildMember
  } from 'discord.js';
  import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState
  } from '@discordjs/voice';
  import { QueueConstructor, Song } from '../types';
  import ytdl from 'ytdl-core';
  import YouTubeAPI from 'youtube-search-api';

  module.exports = {
    data: new SlashCommandBuilder()
      .setName('play')
      .setDescription('Play a song from YouTube')
      .addStringOption(option =>
        option.setName('query')
          .setDescription('Song name or YouTube URL')
          .setRequired(true)
      ),

    async execute(interaction: ChatInputCommandInteraction, queue: Map<string, QueueConstructor>) {
      // Defer the reply to handle longer loading times
      //await interaction.deferReply();

      // Ensure the command is used in a guild
      if (!interaction.guild) {
        return interaction.editReply('This command can only be used in a server.');
      }

      // Check if user is in a voice channel
      const member = interaction.member as GuildMember;
      const voiceChannel = member.voice.channel;

      if (!voiceChannel) {
        return interaction.editReply('You must be in a voice channel to play music!');
      }

      // Get the search query
      const query = interaction.options.getString('query', true);

      try {
        // Search for the song
        const searchResults = await YouTubeAPI.GetListByKeyword(query, false);
        
        if (!searchResults.items || searchResults.items.length === 0) {
          return interaction.editReply('No songs found!');
        }

        const videoId = searchResults.items[0].id;
        const videoInfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);

        const song: Song = {
          title: videoInfo.videoDetails.title,
          url: videoInfo.videoDetails.video_url
        };

        // Get or create server queue
         let serverQueue = queue.get(interaction.guildId!);

        if (!serverQueue) {
          serverQueue = {
            textChannel: interaction.channel as TextChannel,
            voiceChannel: voiceChannel as VoiceChannel,
            connection: null,
            songs: [song],
            volume: 10,
            playing: true,
            loopOne: false,
            loopAll: false
          };

          queue.set(interaction.guildId!, serverQueue);
        } else {
          serverQueue.songs.push(song);
        }

        // If not already playing, start playing
        if (!serverQueue.connection) {
          await this.connectToChannel(voiceChannel, serverQueue);
        }

        // Respond with song added information
        await interaction.editReply(`Added to queue: ${song.title}`);

        // If not already playing, start playing
        if (serverQueue.songs.length === 1) {
          await this.playSong(serverQueue);
        }

      } catch (error) {
        console.error('Error in play command:', error);
        await interaction.editReply('An error occurred while trying to play the song.');
      }
    },

    async connectToChannel(voiceChannel: VoiceChannel, serverQueue: QueueConstructor) {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        serverQueue.connection = connection;
      } catch (error) {
        connection.destroy();
        throw error;
      }
    },

    async playSong(serverQueue: QueueConstructor) {
      if (serverQueue.songs.length === 0) {
        serverQueue.connection?.destroy();
        return;
      }

      const player = createAudioPlayer();
      serverQueue.connection?.subscribe(player);

      const stream = ytdl(serverQueue.songs[0].url, {
        filter: 'audioonly',
        quality: 'highestaudio'
      });

      const resource = createAudioResource(stream);
      player.play(resource);

      player.on(AudioPlayerStatus.Idle, () => {
        // Handle song ending (loop logic, next song, etc.)
        serverQueue.songs.shift();
        this.playSong(serverQueue);
      });

      player.on('error', error => {
        console.error('Player error:', error);
        serverQueue.songs.shift();
        this.playSong(serverQueue);
      });
    }
  };