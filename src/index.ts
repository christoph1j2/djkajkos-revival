// ============================================================================
// INDEX.TS - Hlavní soubor Discord bota
// ============================================================================
// Toto je "mozek" celého bota. Obsahuje:
// - Vytvoření Discord klienta
// - Zpracování příkazů od uživatelů  
// - Přehrávání hudby z YouTube
// ============================================================================

// ============================================================================
// IMPORTY - Načtení knihoven a modulů
// ============================================================================

// Z knihovny "discord.js" načítáme tyto třídy/typy:
import {
  // Client = hlavní třída pro Discord bota, reprezentuje spojení s Discordem
  Client,
  // GatewayIntentBits = oprávnění co bot může sledovat (zprávy, hlasové kanály...)
  GatewayIntentBits,
  // ChatInputCommandInteraction = typ pro slash příkaz od uživatele
  ChatInputCommandInteraction,
  // GuildMember = reprezentuje člena serveru (uživatele na serveru)
  GuildMember,
  // EmbedBuilder = vytváří "fancy" zprávy s barvami, obrázky atd.
  EmbedBuilder,
} from "discord.js";

// Z knihovny "@discordjs/voice" pro hlasové kanály:
import {
  // joinVoiceChannel = funkce pro připojení do hlasového kanálu
  joinVoiceChannel,
  // createAudioPlayer = vytvoří přehrávač audia
  createAudioPlayer,
  // createAudioResource = vytvoří zdroj audia (to co se přehrává)
  createAudioResource,
  // AudioPlayerStatus = stavy přehrávače (hraje, pauza, idle...)
  AudioPlayerStatus,
  // VoiceConnectionStatus = stavy připojení (připojeno, odpojeno...)
  VoiceConnectionStatus,
  // entersState = čeká až se připojení dostane do určitého stavu
  entersState,
  // NoSubscriberBehavior = co dělat když nikdo neposlouchá
  NoSubscriberBehavior,
} from "@discordjs/voice";

// "spawn" z "child_process" = spouští externí programy (jako yt-dlp)
// "child_process" je vestavěný Node.js modul
import { spawn } from "child_process";

// Naše vlastní moduly:
// "./config" = konfigurační soubor s tokenem
import { CONFIG } from "./config";
// "./types" = definice datových typů
import { GuildQueue, Song } from "./types";

// ============================================================================
// GLOBÁLNÍ PROMĚNNÉ
// ============================================================================

// "Map" = datová struktura typu klíč-hodnota (jako objekt, ale lepší pro tento účel)
// "new Map<string, GuildQueue>()" = vytvoř novou prázdnou mapu
// "<string, GuildQueue>" = generický typ - klíče jsou stringy, hodnoty jsou GuildQueue
// 
// Tato mapa uchovává frontu písniček pro každý server (guild)
// Klíč = ID serveru (string)
// Hodnota = objekt GuildQueue s frontou a stavem přehrávání
const queue = new Map<string, GuildQueue>();

// ============================================================================
// VYTVOŘENÍ DISCORD KLIENTA
// ============================================================================

// "new Client({...})" = vytvoř novou instanci Discord klienta
// Parametr je objekt s konfigurací
const client = new Client({
  // "intents" = co bot potřebuje sledovat/vědět
  // Discord vyžaduje explicitní povolení z důvodu soukromí
  intents: [
    // Guilds = základní info o serverech (kanály, role...)
    GatewayIntentBits.Guilds,
    // GuildVoiceStates = kdo je v jakém hlasovém kanálu
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// ============================================================================
// EVENT: READY - Bot je připraven
// ============================================================================

// "client.once(...)" = poslouchej na událost, ale JEN JEDNOU
// "ready" = událost když se bot úspěšně připojil k Discordu
// "() => { ... }" = arrow funkce která se zavolá když událost nastane
client.once("ready", () => {
  // "console.log(...)" = vypiš do konzole
  // "`...`" = template literal (string s proměnnými)
  // "${client.user?.tag}" = jméno bota (např. "MusicBot#1234")
  // "?" = optional chaining - pokud client.user je null, nevyhodí chybu
  console.log(`✅ Logged in as ${client.user?.tag}!`);
  console.log(`🎵 Music bot is ready to play!`);
});

// ============================================================================
// EVENT: INTERACTION CREATE - Uživatel použil příkaz
// ============================================================================

// "client.on(...)" = poslouchej na událost (opakovaně, pokaždé když nastane)
// "interactionCreate" = událost když uživatel interaguje s botem
// "async (interaction)" = asynchronní funkce s parametrem interaction
client.on("interactionCreate", async (interaction) => {
  // "if (!interaction.isChatInputCommand())" = pokud to NENÍ slash příkaz
  // "return" = ukonči funkci (nic nedělej)
  // Toto ignoruje jiné typy interakcí (tlačítka, menu...)
  if (!interaction.isChatInputCommand()) return;

  // "const { commandName } = interaction" = destrukturace
  // Vytáhni vlastnost "commandName" z objektu "interaction"
  // Je to zkratka za: const commandName = interaction.commandName
  const { commandName } = interaction;

  // "try { ... } catch (error) { ... }" = zachytávání chyb
  try {
    // "switch" = rozhodování podle hodnoty proměnné
    // Je to jako několik if-else za sebou
    switch (commandName) {
      // "case "play":" = pokud commandName === "play"
      case "play":
        // "await" = počkej na dokončení asynchronní funkce
        await handlePlay(interaction);
        // "break" = ukonči switch (jinak by pokračoval dalším case)
        break;

      case "stop":
        await handleStop(interaction);
        break;

      case "pause":
        await handlePause(interaction);
        break;

      case "resume":
        await handleResume(interaction);
        break;

      case "skip":
        await handleSkip(interaction);
        break;

      case "queue":
        await handleQueue(interaction);
        break;

      case "loop":
        await handleLoop(interaction);
        break;

      // "default" = pokud žádný case neodpovídá
      default:
        // "interaction.reply(...)" = odpověz uživateli
        // "{ content: ..., ephemeral: true }" = zpráva viditelná jen pro uživatele
        await interaction.reply({ content: "neznami prikazi 😤", ephemeral: true });
    }
  } catch (error) {
    // Pokud nastala chyba kdekoliv v try bloku
    console.error(`Error handling command ${commandName}:`, error);

    const errorMessage = "dyk probjehli nagi erori, sori bro";

    // "interaction.replied" = už jsme odpověděli?
    // "interaction.deferred" = odpověď je "odložená" (načítání...)?
    if (interaction.replied || interaction.deferred) {
      // Pokud ano, použij followUp (další zpráva)
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      // Pokud ne, použij normální reply
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// ============================================================================
// FUNKCE: getVideoInfo - Získání informací o videu z YouTube
// ============================================================================

// "async function" = asynchronní funkce (může používat await)
// "getVideoInfo" = název funkce
// "(query: string)" = parametr "query" typu string
// ": Promise<Song | null>" = návratový typ
//    - "Promise<...>" = asynchronní operace která vrátí hodnotu
//    - "Song | null" = buď objekt Song nebo null (nic nenalezeno)
async function getVideoInfo(query: string): Promise<Song | null> {
  // "return new Promise((resolve) => { ... })" = vytvoř nový Promise
  // Promise = "slib" že někdy v budoucnu dostaneš hodnotu
  // "resolve" = funkce kterou zavoláš když máš výsledek
  return new Promise((resolve) => {
    // Zkontroluj jestli query je URL nebo hledaný text
    // ".startsWith(...)" = začíná string tímto textem?
    // "||" = logické NEBO
    const isUrl = query.startsWith("http://") || query.startsWith("https://");

    // Pokud je to URL, použij ji přímo
    // Pokud ne, přidej "ytsearch1:" pro hledání na YouTube (1 výsledek)
    // "? :" = ternární operátor (zkrácený if-else)
    // "podmínka ? hodnota_pokud_true : hodnota_pokud_false"
    const searchQuery = isUrl ? query : `ytsearch1:${query}`;

    // "spawn(...)" = spusť externí program
    // "yt-dlp" = název programu
    // "[...]" = pole argumentů příkazové řádky
    const ytdlp = spawn("yt-dlp", [
      "--dump-json",    // Vypiš info jako JSON
      "--no-playlist",  // Nestahuj playlisty, jen jedno video
      "--no-warnings",  // Nevypisuj varování
      searchQuery,      // URL nebo hledaný text
    ]);

    // Proměnné pro ukládání výstupu
    // "let" = proměnná která se může měnit (na rozdíl od const)
    let data = "";   // Standardní výstup (stdout)
    let error = "";  // Chybový výstup (stderr)

    // "ytdlp.stdout" = standardní výstup procesu
    // ".on("data", ...)" = když přijdou data
    // "(chunk) => { ... }" = funkce která zpracuje kus dat
    ytdlp.stdout.on("data", (chunk) => {
      // "+=" = přičti k existujícímu stringu
      // ".toString()" = převeď buffer na string
      data += chunk.toString();
    });

    // Podobně pro chybový výstup
    ytdlp.stderr.on("data", (chunk) => {
      error += chunk.toString();
    });

    // "close" událost = proces skončil
    // "code" = exit code (0 = úspěch, jiné = chyba)
    ytdlp.on("close", (code) => {
      // Pokud exit code není 0 NEBO nemáme žádná data
      // "!==" = striktní nerovnost (hodnota A typ musí být různé)
      if (code !== 0 || !data) {
        console.error("yt-dlp error:", error);
        // "resolve(null)" = vrať null (nic nenalezeno)
        resolve(null);
        // "return" = ukonči tuto funkci
        return;
      }

      // "try-catch" pro parsování JSON
      try {
        // "JSON.parse(data)" = převeď JSON string na JavaScript objekt
        const info = JSON.parse(data);

        // "resolve({...})" = vrať objekt Song
        // "||" zde funguje jako "pokud je levá strana falsy, použij pravou"
        // "info.title || "Unknown Title"" = pokud title neexistuje, použij default
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

// ============================================================================
// FUNKCE: formatDuration - Formátování délky na mm:ss
// ============================================================================

// "function" = definice funkce
// "formatDuration" = název
// "(seconds: number)" = parametr seconds typu number (číslo)
// ": string" = návratový typ je string
function formatDuration(seconds: number): string {
  // "Math.floor(...)" = zaokrouhli dolů na celé číslo
  // "seconds / 60" = převeď sekundy na minuty
  const mins = Math.floor(seconds / 60);

  // "%" = modulo (zbytek po dělení)
  // "seconds % 60" = kolik sekund zbyde po odečtení celých minut
  const secs = Math.floor(seconds % 60);

  // ".toString()" = převeď číslo na string
  // ".padStart(2, "0")" = doplň zleva na 2 znaky nulami
  // Takže 5 -> "05", 12 -> "12"
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// FUNKCE: handlePlay - Zpracování příkazu /play
// ============================================================================

// "async function" = asynchronní funkce
// "ChatInputCommandInteraction" = typ parametru (z discord.js)
async function handlePlay(interaction: ChatInputCommandInteraction) {
  // "deferReply()" = řekni Discordu "pracuji na tom, chvilku počkej"
  // Discord vyžaduje odpověď do 3 sekund, deferReply nám dá více času
  await interaction.deferReply();

  // Zkontroluj že jsme na serveru (ne v DM)
  // "interaction.guild" = server kde byl příkaz použit (nebo null v DM)
  if (!interaction.guild || !interaction.guildId) {
    // "editReply" = uprav tu "pracuji na tom" zprávu
    return interaction.editReply("Ti mrtgo vijebaná tenhle příkas de jenom na zervru");
  }

  // Získej člena který použil příkaz
  // "as GuildMember" = type cast - řekni TypeScriptu že to JE GuildMember
  const member = interaction.member as GuildMember;

  // "member.voice.channel" = hlasový kanál ve kterém je uživatel
  const voiceChannel = member.voice.channel;

  // Pokud uživatel není v hlasovém kanálu
  if (!voiceChannel) {
    return interaction.editReply("❌ Tbc musyš bit připojenej abi šla boužďed hudba degež");
  }

  // Zkontroluj oprávnění bota v tom kanálu
  // ".permissionsFor(...)" = jaká oprávnění má daný uživatel/bot
  // "interaction.client.user!" = bot sám (! = určitě není null)
  const permissions = voiceChannel.permissionsFor(interaction.client.user!);

  // "?." = optional chaining - pokud permissions je null, vrať undefined místo chyby
  // ".has(...)" = má toto oprávnění?
  if (!permissions?.has("Connect") || !permissions?.has("Speak")) {
    return interaction.editReply("❌ Nemam práva, tbc vijebaní razizdi!!! 😠");
  }

  // Získej hodnotu parametru "query" z příkazu
  // ".getString("query", true)" = získej string parametr "query"
  // "true" = je povinný (vyhodí chybu pokud chybí)
  const query = interaction.options.getString("query", true);

  try {
    // Získej info o videu
    const songInfo = await getVideoInfo(query);

    if (!songInfo) {
      return interaction.editReply("❌ Nic tagovího neznam goždě");
    }

    // Získej frontu pro tento server, nebo vytvoř novou
    // "queue.get(...)" = získej hodnotu z Map podle klíče
    let guildQueue = queue.get(interaction.guildId);

    // Pokud fronta neexistuje, vytvoř ji
    if (!guildQueue) {
      guildQueue = {
        textChannel: interaction.channel as any, // "as any" = ignoruj typovou kontrolu
        voiceChannel: voiceChannel as any,
        connection: null,
        player: null,
        songs: [],       // Prázdné pole
        playing: false,  // Zatím nehraje
        loopMode: "off", // Loop je vypnutý
      };
      // "queue.set(...)" = ulož do Map
      queue.set(interaction.guildId, guildQueue);
    }

    // Přidej písničku do fronty
    // ".push(...)" = přidej na konec pole
    guildQueue.songs.push(songInfo);

    // Vytvoř embed (fancy zprávu)
    // "new EmbedBuilder()" = vytvoř nový embed
    // Method chaining - každá metoda vrací objekt zpět
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)  // Zelená barva (hexadecimální)
      .setTitle("🎵 Přydáno do fronti!")
      .setDescription(`**[${songInfo.title}](${songInfo.url})**`) // ** = bold, []() = odkaz
      .addFields({ name: "delga", value: songInfo.duration, inline: true })
      .setThumbnail(songInfo.thumbnail || null); // Náhledový obrázek

    // Pokud ještě nehraje, spusť přehrávání
    if (!guildQueue.playing) {
      await startPlayback(interaction.guildId, guildQueue, voiceChannel as any);
      embed.setTitle("🎵 Bravje hraje");
    } else {
      // Pokud už hraje, ukaž pozici ve frontě
      embed.addFields({ name: "Pořaďí ve fronti", value: `${guildQueue.songs.length}`, inline: true });
    }

    // Pošli embed jako odpověď
    // "{ embeds: [embed] }" = pole embedů (Discord podporuje více)
    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error("Error in play command:", error);
    await interaction.editReply("❌ Sori bro ňágí chibi se vlouďyly");
  }
}

// ============================================================================
// FUNKCE: startPlayback - Připojení do kanálu a spuštění přehrávání
// ============================================================================

async function startPlayback(guildId: string, guildQueue: GuildQueue, voiceChannel: any) {
  try {
    // Připoj se do hlasového kanálu
    // "joinVoiceChannel({...})" = vytvoř připojení
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,           // ID kanálu
      guildId: guildId,                      // ID serveru
      adapterCreator: voiceChannel.guild.voiceAdapterCreator, // Adaptér pro Discord.js
    });

    // Počkej až bude připojení ready (max 30 sekund)
    // "30_000" = 30000 milisekund (podtržítka jsou pro čitelnost)
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

    // Ulož připojení do fronty
    guildQueue.connection = connection;

    // Vytvoř audio přehrávač
    const player = createAudioPlayer({
      behaviors: {
        // Co dělat když nikdo neposlouchá - pokračuj v přehrávání
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });
    guildQueue.player = player;

    // "Přihlaš" připojení k přehrávači
    // To znamená: posílej audio z přehrávače do tohoto připojení
    connection.subscribe(player);

    // Poslouchej na odpojení
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Pokus se znovu připojit (5 sekund timeout)
        // "Promise.race([...])" = čekej na první Promise který se dokončí
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
        // Pokud se připojilo, pokračuj
      } catch {
        // Pokud ne, zruš připojení
        connection.destroy();
        queue.delete(guildId);
      }
    });

    // Spusť přehrávání první písničky
    await playSong(guildId, guildQueue);

  } catch (error) {
    console.error("Error starting playback:", error);
    queue.delete(guildId);
    // "throw error" = předej chybu výše (kdo volal tuto funkci)
    throw error;
  }
}

// ============================================================================
// FUNKCE: playSong - Přehrání jedné písničky
// ============================================================================

async function playSong(guildId: string, guildQueue: GuildQueue) {
  // Pokud je fronta prázdná
  // ".length" = počet prvků v poli
  // "=== 0" = striktní rovnost (hodnota I typ musí být stejné)
  if (guildQueue.songs.length === 0) {
    guildQueue.playing = false;

    // Odpoj se po 5 minutách nečinnosti
    // "setTimeout(funkce, čas)" = zavolej funkci za určitý čas
    // "5 * 60 * 1000" = 5 minut v milisekundách
    setTimeout(() => {
      const currentQueue = queue.get(guildId);
      // "&&" = logické A (obě podmínky musí být true)
      if (currentQueue && !currentQueue.playing && currentQueue.songs.length === 0) {
        // "?." = optional chaining
        currentQueue.connection?.destroy();
        queue.delete(guildId);
      }
    }, 5 * 60 * 1000);

    return; // Ukonči funkci
  }

  // Získej první písničku z fronty
  // "[0]" = první prvek pole (indexování od 0)
  const song = guildQueue.songs[0];
  guildQueue.playing = true;

  console.log(`🎵 Now playing: ${song.title}`);
  console.log(`🔗 URL: ${song.url}`);

  try {
    // Spusť yt-dlp pro streamování audia
    const ytdlp = spawn("yt-dlp", [
      "-f", "bestaudio",  // Formát: nejlepší audio
      "-o", "-",          // Output: stdout (místo souboru)
      "--no-playlist",
      "--no-warnings",
      song.url,
    ]);

    // Loguj chyby z yt-dlp (kromě progress zpráv)
    ytdlp.stderr.on("data", (data) => {
      const msg = data.toString();
      // ".includes(...)" = obsahuje string tento podřetězec?
      if (!msg.includes("[download]")) {
        console.error("yt-dlp stderr:", msg);
      }
    });

    // Vytvoř audio resource z stdout yt-dlp
    // "ytdlp.stdout" = standardní výstup procesu (stream dat)
    const resource = createAudioResource(ytdlp.stdout);

    // Přehraj resource na přehrávači
    // "!" = non-null assertion (víme že player není null)
    guildQueue.player!.play(resource);
    console.log(`✅ Playback started`);

    // Když přehrávač přejde do stavu "Idle" (nic nehraje)
    // ".once(...)" = poslouchej JEN JEDNOU (pak se odstraň)
    guildQueue.player!.once(AudioPlayerStatus.Idle, () => {
      console.log(`⏭️ Dohrál zem more vop čip, loop mód: ${guildQueue.loopMode}`);
      
      // Zpracování loop módu
      if (guildQueue.loopMode === "song") {
        // Opakuj stejnou písničku - nedělej nic s frontou
        console.log(`🔁 Looping song: ${song.title}`);
      } else if (guildQueue.loopMode === "queue") {
        // Přesuň písničku na konec fronty
        const finishedSong = guildQueue.songs.shift();
        if (finishedSong) {
          guildQueue.songs.push(finishedSong);
        }
        console.log(`🔁 Looping queue, moved song to end`);
      } else {
        // Loop je vypnutý - odeber písničku z fronty
        guildQueue.songs.shift();
      }
      
      // Rekurze - zavolej sám sebe pro další písničku
      playSong(guildId, guildQueue);
    });

    // Zpracuj chyby přehrávače
    guildQueue.player!.on("error", (error) => {
      console.error("Player error:", error);
      // ".kill()" = ukonči proces
      ytdlp.kill();
      guildQueue.songs.shift();
      playSong(guildId, guildQueue);
    });

    // Zpracuj chyby yt-dlp procesu
    ytdlp.on("error", (error) => {
      console.error("yt-dlp process error:", error);
    });

  } catch (error) {
    console.error("Error playing song:", error);
    guildQueue.songs.shift();
    playSong(guildId, guildQueue);
  }
}

// ============================================================================
// FUNKCE: handleStop - Zpracování příkazu /stop
// ============================================================================

async function handleStop(interaction: ChatInputCommandInteraction) {
  // Zkontroluj že jsme na serveru
  if (!interaction.guild || !interaction.guildId) {
    return interaction.reply({
      content: "Tbc musýš bit přypojenej abi šla boužďed hudba degež",
      ephemeral: true,
    });
  }

  // Získej frontu pro tento server
  const guildQueue = queue.get(interaction.guildId);

  // Pokud fronta neexistuje (nic nehraje)
  if (!guildQueue) {
    return interaction.reply({
      content: "❌ Tag sy ůplně hluchej fžag ňyc nehraje čuragu???",
      ephemeral: true,
    });
  }

  // Vymaž frontu
  // "= []" = prázdné pole
  guildQueue.songs = [];
  guildQueue.playing = false;

  // Zastav přehrávač
  // "?." = pokud player není null, zavolej stop()
  guildQueue.player?.stop();

  // Zruš připojení k hlasovému kanálu
  guildQueue.connection?.destroy();

  // Odeber frontu z mapy
  queue.delete(interaction.guildId);

  // Vytvoř embed s potvrzením
  const embed = new EmbedBuilder()
    .setColor(0xff0000) // Červená
    .setTitle("⏹️ Zastavení")
    .setDescription("Hutba zazdavena!!!");

  // Odpověz (tady používáme reply, ne editReply, protože jsme nedělali deferReply)
  await interaction.reply({ embeds: [embed] });
}

// ============================================================================
// FUNKCE: handlePause - Pozastavení přehrávání
// ============================================================================

async function handlePause(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.guildId) {
    return interaction.reply({ content: "Ti mrtgo vijebaná tenhle příkas de jenom na zervru", ephemeral: true });
  }

  const guildQueue = queue.get(interaction.guildId);

  if (!guildQueue || !guildQueue.player) {
    return interaction.reply({ content: "❌ Fžag ňyc nehraje demende", ephemeral: true });
  }

  // Zkontroluj jestli už není pozastaveno
  // "guildQueue.player.state.status" = aktuální stav přehrávače
  if (guildQueue.player.state.status === AudioPlayerStatus.Paused) {
    return interaction.reply({ content: "⏸️ Už je to pauzlí tbc curagu!", ephemeral: true });
  }

  // ".pause()" = pozastav přehrávání
  guildQueue.player.pause();

  const embed = new EmbedBuilder()
    .setColor(0xffaa00) // Oranžová
    .setTitle("⏸️ Pauzlí")
    .setDescription(`Zabauzoval zem: **${guildQueue.songs[0]?.title || "Nevim co"}`);

  await interaction.reply({ embeds: [embed] });
}

// ============================================================================
// FUNKCE: handleResume - Obnovení přehrávání
// ============================================================================

async function handleResume(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.guildId) {
    return interaction.reply({ content: "Ti mrtgo vijebaná tenhle příkas de jenom na zervru", ephemeral: true });
  }

  const guildQueue = queue.get(interaction.guildId);

  if (!guildQueue || !guildQueue.player) {
    return interaction.reply({ content: "❌ Ňení co odbauzovat mrtgo vijebana", ephemeral: true });
  }

  // Zkontroluj jestli je pozastaveno
  if (guildQueue.player.state.status !== AudioPlayerStatus.Paused) {
    return interaction.reply({ content: "▶️ Fžag to ňení zazdaveni!", ephemeral: true });
  }

  // ".unpause()" = obnov přehrávání
  guildQueue.player.unpause();

  const embed = new EmbedBuilder()
    .setColor(0x00ff00) // Zelená
    .setTitle("▶️ Zaz to hraje vopvop")
    .setDescription(`Zaz hraje: **${guildQueue.songs[0]?.title || "Nevim co"}**`);

  await interaction.reply({ embeds: [embed] });
}

// ============================================================================
// FUNKCE: handleSkip - Přeskočení na další písničku
// ============================================================================

async function handleSkip(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.guildId) {
    return interaction.reply({ content: "Ti mrtgo vijebaná tenhle příkas de jenom na zervru", ephemeral: true });
  }

  const guildQueue = queue.get(interaction.guildId);

  if (!guildQueue || !guildQueue.player || guildQueue.songs.length === 0) {
    return interaction.reply({ content: "❌ Ňení co skipnout tbc", ephemeral: true });
  }

  const skippedSong = guildQueue.songs[0];

  // ".stop()" zastaví přehrávač, což spustí "Idle" event a přehraje další
  // Ale musíme ošetřit loop mód - při skipu chceme přeskočit, ne opakovat
  const wasLoopSong = guildQueue.loopMode === "song";
  if (wasLoopSong) {
    // Dočasně vypni loop pro tento skip
    guildQueue.loopMode = "off";
  }

  guildQueue.player.stop();

  // Obnov loop mód po skipu
  if (wasLoopSong) {
    // Použijeme setTimeout aby se loop mód obnovil až po zpracování Idle eventu
    setTimeout(() => {
      const q = queue.get(interaction.guildId!);
      if (q) q.loopMode = "song";
    }, 100);
  }

  const embed = new EmbedBuilder()
    .setColor(0x00aaff) // Modrá
    .setTitle("⏭️ Brezgočeno")
    .setDescription(`Březgočil zem: **${skippedSong.title}**`);

  // Pokud je další písnička, ukaž ji
  if (guildQueue.songs.length > 1) {
    embed.addFields({ name: "Teť bude", value: guildQueue.songs[1].title, inline: true });
  }

  await interaction.reply({ embeds: [embed] });
}

// ============================================================================
// FUNKCE: handleQueue - Zobrazení fronty
// ============================================================================

async function handleQueue(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.guildId) {
    return interaction.reply({ content: "Ti mrtgo vijebaná tenhle příkas de jenom na zervru", ephemeral: true });
  }

  const guildQueue = queue.get(interaction.guildId);

  if (!guildQueue || guildQueue.songs.length === 0) {
    return interaction.reply({ content: "📋 Fronta je prázdná huba obrubňig!", ephemeral: true });
  }

  // Vytvoř seznam písniček
  // ".map((song, index) => ...)" = pro každou písničku vytvoř string
  // "index" = pozice v poli (0, 1, 2...)
  const songList = guildQueue.songs
    .slice(0, 10) // Zobraz max 10 písniček
    .map((song, index) => {
      // První písnička = právě hraje
      const prefix = index === 0 ? "▶️ **Bravje hraje:**" : `${index}.`;
      return `${prefix} [${song.title}](${song.url}) - ${song.duration}`;
    })
    .join("\n"); // Spoj do jednoho stringu s novými řádky

  // Loop mód jako emoji
  const loopEmoji = guildQueue.loopMode === "song" ? "🔂" : 
                    guildQueue.loopMode === "queue" ? "🔁" : "➡️";
  const loopText = guildQueue.loopMode === "song" ? "Looping song" :
                   guildQueue.loopMode === "queue" ? "Looping queue" : "No loop";

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6) // Fialová
    .setTitle("📋 Fronta bizniceg")
    .setDescription(songList)
    .addFields(
      { name: "Kolik bizniceg tadi je", value: `${guildQueue.songs.length}`, inline: true },
      { name: `${loopEmoji} Obagování`, value: loopText, inline: true }
    );

  // Pokud je více než 10 písniček
  if (guildQueue.songs.length > 10) {
    embed.setFooter({ text: `...a dalšy ${guildQueue.songs.length - 10} bizniceg` });
  }

  await interaction.reply({ embeds: [embed] });
}

// ============================================================================
// FUNKCE: handleLoop - Nastavení loop módu
// ============================================================================

async function handleLoop(interaction: ChatInputCommandInteraction) {
  if (!interaction.guild || !interaction.guildId) {
    return interaction.reply({ content: "Ti mrtgo vijebaná tenhle příkas de jenom na zervru", ephemeral: true });
  }

  const guildQueue = queue.get(interaction.guildId);

  if (!guildQueue) {
    return interaction.reply({ content: "❌ Fžag ňyc nehraje!", ephemeral: true });
  }

  // Získej zvolený mód
  const mode = interaction.options.getString("mode", true) as "off" | "song" | "queue";

  // Nastav nový loop mód
  guildQueue.loopMode = mode;

  // Vyber emoji a text podle módu
  let emoji: string;
  let description: string;

  switch (mode) {
    case "song":
      emoji = "🔂";
      description = "Teť se bude obagovat tahle pecga";
      break;
    case "queue":
      emoji = "🔁";
      description = "Teť se bude obagovat celá fronti";
      break;
    default:
      emoji = "➡️";
      description = "Obagování vipnuto";
  }

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6) // Fialová
    .setTitle(`${emoji} Obagování`)
    .setDescription(description);

  await interaction.reply({ embeds: [embed] });
}

// ============================================================================
// SPUŠTĚNÍ BOTA
// ============================================================================

// ".login(token)" = připoj se k Discordu s tímto tokenem
// Toto je poslední řádek - po něm bot běží a čeká na události
client.login(CONFIG.DISCORD_BOT_TOKEN);
