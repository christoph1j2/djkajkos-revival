# DJ Kajkos Revival 🎵

A simple and functional Discord music bot that plays audio from YouTube. Built with Discord.js, TypeScript, and yt-dlp.

## Features

- 🎵 **Play music** from YouTube (URL or search query)
- ⏹️ **Stop playback** and clear the queue
- 🔄 Automatic queue management
- 📋 Beautiful embed messages
- 🐳 Docker support

## Prerequisites

### Local Development

- [Node.js](https://nodejs.org/) v18 or higher
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube downloader
- [FFmpeg](https://ffmpeg.org/) - Audio processing
- A Discord Bot Token ([Discord Developer Portal](https://discord.com/developers/applications))

#### Installing yt-dlp and FFmpeg

**Windows (winget):**
```bash
winget install yt-dlp.yt-dlp
```
This will also install FFmpeg as a dependency.

**macOS (Homebrew):**
```bash
brew install yt-dlp ffmpeg
```

**Linux (apt):**
```bash
sudo apt install ffmpeg
pip install yt-dlp
```

### Docker

If using Docker, all dependencies (yt-dlp, FFmpeg) are included in the container.

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd djkajkos-revival
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

#### How to get these values:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. **CLIENT_ID**: Copy the "Application ID" from the "General Information" tab
4. **DISCORD_BOT_TOKEN**: Go to the "Bot" tab and click "Reset Token" to get your bot token

### 4. Register slash commands

```bash
npm run register
```

### 5. Invite the bot to your server

Use this URL template (replace `YOUR_CLIENT_ID`):

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3145728&scope=bot%20applications.commands
```

Required permissions:
- Connect (to voice channels)
- Speak (to play audio)
- Use Slash Commands

### 6. Run the bot

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

## Commands

| Command | Description |
|---------|-------------|
| `/play <query>` | Play a song from YouTube. Accepts a URL or search query. |
| `/stop` | Stop the current playback and clear the queue. |

## Docker Deployment

### Using Docker Compose (Recommended)

1. Make sure your `.env` file is configured
2. Run:

```bash
docker-compose up -d
```

### Using Docker directly

```bash
# Build the image
docker build -t djkajkos-revival .

# Run the container
docker run -d \
  --name djkajkos-revival \
  --env-file .env \
  --restart unless-stopped \
  djkajkos-revival
```

## Project Structure

```
djkajkos-revival/
├── src/
│   ├── index.ts              # Main bot file with commands
│   ├── config.ts             # Environment configuration
│   ├── types.ts              # TypeScript interfaces
│   └── register-commands.ts  # Slash command registration
├── dist/                     # Compiled JavaScript (generated)
├── .env                      # Environment variables (create from .env.example)
├── .env.example              # Example environment file
├── docker-compose.yml        # Docker Compose configuration
├── Dockerfile                # Docker build instructions
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## How It Works

The bot uses **yt-dlp** to:
1. Search for videos on YouTube (if a search query is provided)
2. Extract video metadata (title, duration, thumbnail)
3. Stream audio directly to Discord voice channels

This approach is more reliable than using Node.js YouTube libraries because yt-dlp is actively maintained and handles YouTube's frequent changes automatically.

## Troubleshooting

### Bot joins but no audio plays

1. Make sure `yt-dlp` is installed and accessible from your PATH
2. Verify FFmpeg is installed: `ffmpeg -version`
3. Check the console for error messages

### "yt-dlp not found" error

Install yt-dlp globally:
```bash
# Windows
winget install yt-dlp.yt-dlp

# macOS
brew install yt-dlp

# Linux
pip install yt-dlp
```

### Commands not showing up

1. Run `npm run register` to register slash commands
2. Wait a few minutes for Discord to propagate the commands
3. Make sure the bot has the `applications.commands` scope

## Future Features

- ⏸️ Pause/Resume
- 🔁 Loop (single song / queue)
- 📋 Queue display
- ⏭️ Skip to next song
- 🔀 Shuffle queue

## License

ISC
