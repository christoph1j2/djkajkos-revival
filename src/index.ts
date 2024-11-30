import {Client, GatewayIntentBits, Collection, REST, Routes } from "discord.js";
import { CONFIG } from "./config";
import {Song, QueueConstructor} from "./types";
import * as fs from 'fs';
import * as path from 'path';

class MusicBot extends Client {
    public queue: Map<string, QueueConstructor>;
    public commands: Collection<string, any>;

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent,
            ],
        });

        this.queue = new Map();
        this.commands = new Collection();
        this.loadCommands();
        this.setupEventListeners();
    }

    private loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            this.commands.set(command.name, command);
        }
    }

    private async registerSlashCommands() {
        const commands = [];
        const commandsPath = path.join(__dirname, 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }

        if(CONFIG.DISCORD_BOT_TOKEN === undefined) return;
        const rest = new REST().setToken(CONFIG.DISCORD_BOT_TOKEN);

        try {
            console.log(`Started refreshing ${commands.length} application (/) commands.`);

            if (CONFIG.CLIENT_ID === undefined) {return}
            const data: any = await rest.put(
            Routes.applicationCommands(CONFIG.CLIENT_ID),
            { body: commands },
            );

            console.log(`Successfully reloaded ${data.length} application (/) commands.`);
        } catch (error) {
            console.error(error);
        }
    }

    private setupEventListeners() {
        this.on('ready', () => {
            console.log(`Logged in as ${this.user?.tag}!`);
        });

        this.on('messageCreate', async (message) => {
            if (!message.content.startsWith(CONFIG.PREFIX) || message.author.bot) return;

            const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
            const commandName = args.shift()?.toLowerCase();

            if(!commandName) return;

            const command = this.commands.get(commandName);
            if(!command) return;

            try {
                await command.execute(message, args, this.queue);
            } catch (error) {
                console.error(error);
                message.reply('there was an error trying to execute that command!');
            }
        });
    }

    public start() {
        this.login(CONFIG.DISCORD_BOT_TOKEN);
    }
}

const bot = new MusicBot();
bot.start();