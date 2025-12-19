// ============================================================================
// CONFIG.TS - Konfigurace a načítání environment proměnných
// ============================================================================
// Tento soubor načítá citlivé údaje (tokeny, hesla) z .env souboru.
// Proč? Protože nechceme mít hesla přímo v kódu - ten jde na GitHub!
// ============================================================================

// "import" = načti knihovnu nebo soubor
// "dotenv" = knihovna pro načítání .env souborů
// "from" = odkud
import dotenv from "dotenv";

// Zavolej funkci "config()" z knihovny dotenv
// Toto načte soubor ".env" a jeho hodnoty dá do "process.env"
// "process.env" = objekt obsahující všechny environment proměnné systému
dotenv.config();

// ============================================================================
// EXPORT KONFIGURACE
// ============================================================================
// "export" = umožní importovat tuto proměnnou v jiných souborech
// "const" = konstanta (hodnota se nemůže změnit)
// "CONFIG" = název naší konstanty (velká písmena = konvence pro konstanty)
// "=" = přiřazení hodnoty
// "{ ... }" = objekt (kontejner pro páry klíč: hodnota)
export const CONFIG = {
  // "DISCORD_BOT_TOKEN" = klíč (název vlastnosti)
  // ":" = odděluje klíč od hodnoty
  // "process.env.DISCORD_BOT_TOKEN" = čteme hodnotu z environment proměnných
  // Tato hodnota přišla ze souboru .env díky dotenv.config() výše
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,

  // Client ID naší Discord aplikace
  CLIENT_ID: process.env.CLIENT_ID,

  // Guild ID (volitelné) - pro rychlejší registraci příkazů během vývoje
  GUILD_ID: process.env.GUILD_ID,
};

// ============================================================================
// VALIDACE - Zkontroluj že máme všechny potřebné hodnoty
// ============================================================================

// "if" = podmínka - pokud je výraz v závorce pravdivý, spusť kód v {}
// "!" před výrazem = negace (obrátí true na false a naopak)
// "!CONFIG.DISCORD_BOT_TOKEN" = "pokud NENÍ token"
// Prázdný string "", null, undefined = všechno se vyhodnotí jako "nepravda" (falsy)
if (!CONFIG.DISCORD_BOT_TOKEN) {
  // "throw" = vyhoď chybu (program se zastaví)
  // "new Error(...)" = vytvoř nový objekt chyby se zprávou
  throw new Error("DISCORD_BOT_TOKEN is required in .env file");
}

// Stejná kontrola pro CLIENT_ID
if (!CONFIG.CLIENT_ID) {
  throw new Error("CLIENT_ID is required in .env file");
}
