// ============================================================================
// REGISTER-COMMANDS.TS - Registrace slash příkazů na Discord
// ============================================================================
// Tento soubor se spouští JEDNOU (npm run register) aby Discord věděl,
// jaké příkazy náš bot má. Discord pak zobrazí tyto příkazy uživatelům
// když napíšou "/" v chatu.
// ============================================================================

// Načteme potřebné třídy z discord.js knihovny
// "REST" = třída pro komunikaci s Discord API přes HTTP
// "Routes" = obsahuje URL adresy Discord API
// "SlashCommandBuilder" = pomocník pro vytváření slash příkazů
import { REST, Routes, SlashCommandBuilder } from "discord.js";

// Načteme naši konfiguraci (token a client ID)
// "./" = aktuální složka
// "./config" = soubor config.ts ve stejné složce
import { CONFIG } from "./config";

// ============================================================================
// DEFINICE PŘÍKAZŮ
// ============================================================================

// "const" = konstanta (nemění se)
// "commands" = název proměnné
// "[...]" = pole (array) - seznam věcí
const commands = [
  // --------------------------------------------------------------------------
  // PŘÍKAZ /play
  // --------------------------------------------------------------------------
  // "new" = vytvoř novou instanci třídy
  // "SlashCommandBuilder()" = třída pro stavbu příkazu
  // "." = přístup k metodě objektu
  // Toto je "method chaining" - voláme metody za sebou (každá vrací objekt zpět)
  new SlashCommandBuilder()
    // ".setName("play")" = nastav název příkazu na "play"
    // Uživatel pak napíše /play
    .setName("play")

    // ".setDescription(...)" = popis co příkaz dělá (zobrazí se v Discordu)
    .setDescription("Play a song from YouTube")

    // ".addStringOption(...)" = přidej textový parametr k příkazu
    // "(option) => ..." = arrow funkce (zkrácený zápis funkce)
    // "option" = parametr funkce (objekt pro konfiguraci této možnosti)
    // "=>" = odděluje parametry od těla funkce
    .addStringOption((option) =>
      option
        // Název parametru (interně)
        .setName("query")
        // Popis parametru (zobrazí se uživateli)
        .setDescription("YouTube URL or search query")
        // Parametr je povinný (true = ano, false = ne)
        .setRequired(true)
    ),

  // --------------------------------------------------------------------------
  // PŘÍKAZ /stop
  // --------------------------------------------------------------------------
  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop the music and clear the queue"),

  // --------------------------------------------------------------------------
  // PŘÍKAZ /pause
  // --------------------------------------------------------------------------
  new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the currently playing song"),

  // --------------------------------------------------------------------------
  // PŘÍKAZ /resume
  // --------------------------------------------------------------------------
  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the paused song"),

  // --------------------------------------------------------------------------
  // PŘÍKAZ /skip
  // --------------------------------------------------------------------------
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skip to the next song in queue"),

  // --------------------------------------------------------------------------
  // PŘÍKAZ /queue
  // --------------------------------------------------------------------------
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current song queue"),

  // --------------------------------------------------------------------------
  // PŘÍKAZ /loop
  // --------------------------------------------------------------------------
  new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Set loop mode")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Loop mode: off, song (repeat one), or queue (repeat all)")
        .setRequired(true)
        .addChoices(
          { name: "Off", value: "off" },
          { name: "Song (repeat one)", value: "song" },
          { name: "Queue (repeat all)", value: "queue" }
        )
    ),

  // Konec pole příkazů
]
  // ".map(...)" = transformuj každý prvek pole
  // Pro každý příkaz zavolej ".toJSON()" aby se převedl na obyčejný objekt
  // Discord API očekává JSON, ne instance tříd
  .map((command) => command.toJSON());

// ============================================================================
// VYTVOŘENÍ REST KLIENTA
// ============================================================================

// Vytvoř nový REST klient pro komunikaci s Discord API
// ".setToken(...)" = nastav autorizační token
// "CONFIG.DISCORD_BOT_TOKEN!" = hodnota tokenu
// "!" na konci = říkáme TypeScriptu "věř mi, tato hodnota NENÍ null/undefined"
//                (protože jsme to zkontrolovali v config.ts)
const rest = new REST().setToken(CONFIG.DISCORD_BOT_TOKEN!);

// ============================================================================
// HLAVNÍ FUNKCE - Registrace příkazů
// ============================================================================

// "(async () => { ... })()" = IIFE (Immediately Invoked Function Expression)
// Rozložme si to:
// "async" = tato funkce je asynchronní (může používat await)
// "()" = funkce nemá žádné parametry
// "=>" = arrow funkce
// "{ ... }" = tělo funkce
// "()" na konci = okamžitě tuto funkci zavolej
// 
// Proč? Protože "await" lze použít pouze uvnitř async funkce,
// ale my jsme na nejvyšší úrovni souboru.
(async () => {
  // "try { ... } catch { ... }" = zachytávání chyb
  // Kód v "try" se pokusí provést
  // Pokud nastane chyba, skočí se do "catch"
  try {
    // "console.log(...)" = vypiš text do konzole (terminálu)
    // "`...`" = template literal (string s proměnnými)
    // "${...}" = vlož hodnotu proměnné do stringu
    // "${commands.length}" = počet prvků v poli commands
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // "await" = počkej než se tato operace dokončí
    // Bez await by kód pokračoval dál, aniž by čekal na odpověď od Discordu
    // 
    // "rest.put(...)" = HTTP PUT požadavek na Discord API
    // PUT = aktualizuj/nahraď data
    //
    // "Routes.applicationCommands(CONFIG.CLIENT_ID!)" = URL adresa kam poslat
    // Toto vrátí něco jako: "/applications/123456789/commands"
    //
    // "{ body: commands }" = tělo požadavku (data která posíláme)
    const data = await rest.put(
      Routes.applicationCommands(CONFIG.CLIENT_ID!),
      { body: commands }
    );

    // Úspěch! Vypiš zprávu
    console.log(`Successfully reloaded application (/) commands.`);

    // Vypiš názvy registrovaných příkazů
    // ".map((c) => c.name)" = z každého příkazu vytáhni jen jeho název
    // ".join(", ")" = spoj pole do jednoho stringu, oddělené čárkami
    console.log("Commands registered:", commands.map((c) => c.name).join(", "));

  } catch (error) {
    // Pokud nastala chyba, vypiš ji
    // "console.error(...)" = vypiš chybu (červeně v konzoli)
    console.error("Error registering commands:", error);
  }
})();
// ^ Tady se ta funkce okamžitě zavolá díky "()" na konci
