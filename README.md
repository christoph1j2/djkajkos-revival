# DJ Kajkos Revival 🎵

Privátní discord music bot pro moji friend group.

## Commands

| Příkaz | Co to dělá |
|--------|------------|
| `/play <query>` | Přehraje písničku z YouTube (URL nebo hledání) |
| `/pause` | Pozastaví přehrávání |
| `/resume` | Obnoví přehrávání |
| `/skip` | Přeskočí na další písničku |
| `/stop` | Zastaví přehrávání a vymaže frontu |
| `/queue` | Zobrazí frontu písniček |
| `/loop <mode>` | Loop mód: `off`, `song` (opakuj jednu), `queue` (opakuj všechny) |

## How It Works

Bot používá **yt-dlp** pro:
1. Hledání videí na YouTube
2. Získání metadat (název, délka, thumbnail)
3. Streamování audia přímo do Discord voice kanálu

yt-dlp je spolehlivější než Node.js YouTube knihovny, protože je aktivně udržovaný a zvládá časté změny YouTube API.
