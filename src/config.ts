import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    CLIENT_ID: process.env.CLIENT_ID,
    PREFIX: '!',
};