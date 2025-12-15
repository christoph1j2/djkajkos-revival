import {
  Client,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import { spawn } from "child_process";
import { CONFIG } from "./config";
import { GuildQueue, Song } from "./types";

// Global queue map
const queue = new Map<string, GuildQueue>();

// Create the Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Ready event
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user?.tag}!`);
  console.log(`🎵 Music bot is ready to play!`);
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "play":
        await handlePlay(interaction);
        break;
      case "stop":
        await handleStop(interaction);
        break;
      default:
        await interaction.reply({ content: "neznami prikazi 😤", ephemeral: true });
    }
  } catch (error) {
    console.error(`Error handling command ${commandName}:`, error);
    const errorMessage = "dyk probjehli nagi erori, sori bro";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Get video info using yt-dlp
async function getVideoInfo(query: string): Promise<Song | null> {
  return new Promise((resolve) => {
    const isUrl = query.startsWith("http://") || query.startsWith("https://");
    const searchQuery = isUrl ? query : `ytsearch1:${query}`;
    
    const ytdlp = spawn("yt-dlp", [
      "--dump-json",
      "--no-playlist",
      "--no-warnings",
      searchQuery,
    ]);

    let data = "";
    let error = "";

    ytdlp.stdout.on("data", (chunk) => {
      data += chunk.toString();
    });

    ytdlp.stderr.on("data", (chunk) => {
      error += chunk.toString();
    });

    ytdlp.on("close", (code) => {
      if (code !== 0 || !data) {
        console.error("yt-dlp error:", error);
        resolve(null);
        return;
      }

      try {
        const info = JSON.parse(data);
        resolve({
          title: info.title || "Unknown Title",
          url: info.webpage_url || info.url,
          duration: formatDuration(info.duration || 0),
          thumbnail: info.thumbnail || "",
        });
      } catch (e) {
        console.error("Failed to parse yt-dlp output:", e);
        resolve(null);
      }
    });
  });
}

// Format duration from seconds to mm:ss
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Play command handler
async function handlePlay(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Validate guild context
  if (!interaction.guild || !interaction.guildId) {
    return interaction.editReply("Ti mrtgo viebaná tenhle příkas de jenom na zervru");
  }

  // Check if user is in a voice channel
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    return interaction.editReply("❌ Tbc musyš bit připojenej abi šla boužďed hudba degež");
  }

  // Check bot permissions
  const permissions = voiceChannel.permissionsFor(interaction.client.user!);
  if (!permissions?.has("Connect") || !permissions?.has("Speak")) {
    return interaction.editReply("❌ Nemam práva, tbc vijebaní razizdi!!! 😠");
  }

  const query = interaction.options.getString("query", true);

  try {
    // Get song info
    const songInfo = await getVideoInfo(query);
    
    if (!songInfo) {
      return interaction.editReply("❌ Nic tagovího neznam goždě");
    }

    // Get or create the guild queue
    let guildQueue = queue.get(interaction.guildId);

    if (!guildQueue) {
      guildQueue = {
        textChannel: interaction.channel as any,
        voiceChannel: voiceChannel as any,
        connection: null,
        player: null,
        songs: [],
        playing: false,
      };
      queue.set(interaction.guildId, guildQueue);
    }

    // Add song to queue
    guildQueue.songs.push(songInfo);

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("🎵 Přydáno do fronti!")
      .setDescription(`**[${songInfo.title}](${songInfo.url})**`)
      .addFields({ name: "delga", value: songInfo.duration, inline: true })
      .setThumbnail(songInfo.thumbnail || null);

    // If not playing, start playback
    if (!guildQueue.playing) {
      await startPlayback(interaction.guildId, guildQueue, voiceChannel as any);
      embed.setTitle("🎵 Právě hraje");
    } else {
      embed.addFields({ name: "Pořadí ve frontě", value: `${guildQueue.songs.length}`, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error("Error in play command:", error);
    await interaction.editReply("❌ Sori bro ňágí chibi se vlouďyly");
  }
}

// Start playback function
async function startPlayback(guildId: string, guildQueue: GuildQueue, voiceChannel: any) {
  try {
    // Join the voice channel
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    // Wait for connection to be ready
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    guildQueue.connection = connection;

    // Create audio player
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });
    guildQueue.player = player;

    // Subscribe connection to player
    connection.subscribe(player);

    // Handle connection state changes
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
        queue.delete(guildId);
      }
    });

    // Play the first song
    await playSong(guildId, guildQueue);

  } catch (error) {
    console.error("Error starting playback:", error);
    queue.delete(guildId);
    throw error;
  }
}

// Play song function using yt-dlp to pipe audio
async function playSong(guildId: string, guildQueue: GuildQueue) {
  if (guildQueue.songs.length === 0) {
    guildQueue.playing = false;
    // Disconnect after 5 minutes of inactivity
    setTimeout(() => {
      const currentQueue = queue.get(guildId);
      if (currentQueue && !currentQueue.playing && currentQueue.songs.length === 0) {
        currentQueue.connection?.destroy();
        queue.delete(guildId);
      }
    }, 5 * 60 * 1000);
    return;
  }

  const song = guildQueue.songs[0];
  guildQueue.playing = true;

  console.log(`🎵 Now playing: ${song.title}`);
  console.log(`🔗 URL: ${song.url}`);

  try {
    // Use yt-dlp to get audio stream and pipe directly
    const ytdlp = spawn("yt-dlp", [
      "-f", "bestaudio",
      "-o", "-",           // Output to stdout
      "--no-playlist",
      "--no-warnings",
      song.url,
    ]);

    ytdlp.stderr.on("data", (data) => {
      const msg = data.toString();
      if (!msg.includes("[download]")) {
        console.error("yt-dlp stderr:", msg);
      }
    });

    const resource = createAudioResource(ytdlp.stdout);
    guildQueue.player!.play(resource);
    console.log(`✅ Playback started`);

    // Handle player state changes
    guildQueue.player!.once(AudioPlayerStatus.Idle, () => {
      console.log(`⏭️ Dohrál zem more vop čip, co bude dál za poděli??`);
      guildQueue.songs.shift();
      playSong(guildId, guildQueue);
    });

    guildQueue.player!.on("error", (error) => {
      console.error("Player error:", error);
      ytdlp.kill();
      guildQueue.songs.shift();
      playSong(guildId, guildQueue);
    });

    ytdlp.on("error", (error) => {
      console.error("yt-dlp process error:", error);
    });

  } catch (error) {
    console.error("Error playing song:", error);
    guildQueue.songs.shift();
    playSong(guildId, guildQueue);
  }
}

// Stop command handler
async function handleStop(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.guildId) {
    return interaction.reply({ content: "Tbc musýš bit přypojenej abi šla boužďed hudba degež", ephemeral: true });
  }

  const guildQueue = queue.get(interaction.guildId);

  if (!guildQueue) {
    return interaction.reply({ content: "❌ Tag sy ůplně hluchej fžag ňyc nehraje čuragu???", ephemeral: true });
  }

  // Clear the queue
  guildQueue.songs = [];
  guildQueue.playing = false;

  // Stop the player
  guildQueue.player?.stop();

  // Destroy connection
  guildQueue.connection?.destroy();

  // Remove from queue map
  queue.delete(interaction.guildId);

  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("⏹️ Zastavení")
    .setDescription("Hutba zazdavena!!!");

  await interaction.reply({ embeds: [embed] });
}

// Login
client.login(CONFIG.DISCORD_BOT_TOKEN);
