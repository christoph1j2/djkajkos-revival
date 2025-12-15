import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { CONFIG } from "./config";

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("YouTube URL or search query")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the music and clear the queue"),
].map((command) => command.toJSON());

const rest = new REST().setToken(CONFIG.DISCORD_BOT_TOKEN!);

(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // Register commands globally
    const data = await rest.put(
      Routes.applicationCommands(CONFIG.CLIENT_ID!),
      { body: commands }
    );

    console.log(`Successfully reloaded application (/) commands.`);
    console.log("Commands registered:", commands.map((c) => c.name).join(", "));
  } catch (error) {
    console.error("Error registering commands:", error);
  }
})();
