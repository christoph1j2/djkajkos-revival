import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID, // Optional: for faster command registration during development
};

// Validate required environment variables
if (!CONFIG.DISCORD_BOT_TOKEN) {
  throw new Error("DISCORD_BOT_TOKEN is required in .env file");
}

if (!CONFIG.CLIENT_ID) {
  throw new Error("CLIENT_ID is required in .env file");
}
