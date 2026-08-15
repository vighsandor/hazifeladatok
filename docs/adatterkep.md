# Adattérkép — egy ügyfélkérés teljes útja

Ez a dokumentum végigköveti, hogy egy ügyfél kérdéséből **milyen adat, hova, mikor** kerül — a `/support`
oldalon való begépeléstől a válaszig vagy az emberi eszkalációig. A cél, hogy egyetlen ránézésre látszódjon,
mi marad a saját környezetünkben, és mi hagyja el azt.

| Lépés | Milyen adat | Hova megy (szolgáltató, régió) | Nálunk marad? | Naplózzuk? |
|---|---|---|---|---|
| **1. Ügyfél kérdése a `/support`-on** | A kérdés nyers szövege | Sehova — nálunk keletkezik, a saját webszerverünkön | ✅ Igen | ✅ Igen (`logs/interactions.jsonl`) |
| **2. HyDE — hipotetikus válasz** | **A kérdés teljes szövege** promptban | OpenAI, `gpt-4o-mini` — **USA** | ❌ Kilép | Csak a tény és a válaszidő, a prompt nem |
| **3. Embedding** | A HyDE által generált bekezdés (a kérdésből származtatva, nem a nyers kérdés) | OpenAI, `text-embedding-3-small` — **USA** | ❌ Kilép | Nem |
| **4. Keresés a vektor-adatbázisban** | Lekérdező vektor + a nyilvános ETSI chunkok | Saját pgvector/Postgres — **a mi környezetünk** | ✅ Igen | Nem (csak a találatok száma közvetve) |
| **5. Rerank** | **A kérdés** + a 20 jelölt ETSI chunk szövege | Anthropic, `claude-haiku-4-5` — **USA** | ❌ Kilép | Csak a legjobb pontszám (`topScore`) |
| **6. Válasz generálása** | **A kérdés** + a top-5 ETSI chunk szövege | Anthropic, `claude-sonnet-4-5` — **USA** | ❌ Kilép | A válasz nem; a forrás-szám igen |
| **7. Handoff bizonytalanság esetén** | Handoff id, a kérdés, ok (`out_of_scope` / `low_confidence`), `topScore`, időbélyeg | Sehova — a saját rendszerünk (`support/handoffs.jsonl`) | ✅ Igen | ✅ Igen |

## Nálunk marad

- **A tudásbázis** — a 20 ETSI szabvány szövege, chunkolva (`knowledge_chunks`)
- **A vektorok** — az 1 657 chunk embeddingje a saját pgvector adatbázisunkban
- **`logs/interactions.jsonl`** — az interakciós napló
- **`support/handoffs.jsonl`** — az emberi eszkalációk sora

Ezek egyike sem hagyja el a saját környezetünket: a keresés teljes egészében nálunk fut, a modellek csak a
kérdést és a *már kiválasztott* chunkokat látják, a tudásbázist mint egészet soha.

## Naplóba kerül

Interakciónként egyetlen JSON sor, pontosan ezekkel a mezőkkel:

- **időbélyeg** (`ts`, ISO)
- **a kérdés szövege** (`question`)
- **válaszolt vagy eszkalált** (`mode`: `answer` / `handoff`, eszkalációnál `reason`)
- **magabiztosság** (`topScore` — a rerank legjobb pontszáma, 0–10)
- **válaszidő** (`latencyMs`)
- **forrás-szám** (`sourcesCount`)

A **válasz szövegét nem naplózzuk**, csak azt, hogy hány forrásra támaszkodott.

## Sosem küldjük ki szándékosan

- **Az ügyfél személyes azonosítóit** — a rendszer nem kér és nem továbbít nevet, e-mailt, ügyfélszámot,
  IP-címet vagy munkamenet-azonosítót; a modellhívások kizárólag a kérdés szövegét és ETSI-szövegrészleteket
  tartalmaznak.
- **A tudásbázis maga nyilvános** — az ETSI szabványok szabadon letölthetők, tehát a 4–6. lépésben kiküldött
  chunkok nem üzleti titkot, hanem publikus szabványszöveget hordoznak.

## A fő adat-kilépési pont

**Ki kell mondani: a kérdés szövege elhagyja a saját környezetünket, és az USA-beli OpenAI és Anthropic
API-khoz jut** (a 2., 5. és 6. lépésben). Ez a rendszer működésének feltétele, nem mellékhatás — és mivel a
kérdést az ügyfél írja, elvileg bármit beleírhat, akár olyat is, amit nem kellene.

Mérséklés, a jelenlegi állapot szerint:

| Intézkedés | Állapot |
|---|---|
| **AI-jelölés** a `/support` oldal tetején — az ügyfél tudja, hogy géppel beszél | ✅ Megvalósítva |
| **„Kérjük, ne adj meg személyes vagy bizalmas adatot"** — ugyanabban a jól látható sávban | ✅ Megvalósítva |
| **PII-szűrő** a kérdésen, a modellhívás előtt (opcionális) | ⬜ Nincs megvalósítva — döntést igényel |
| **Enterprise / Zero-Data-Retention szerződés** a szolgáltatókkal, hogy a kérdések ne maradjanak meg náluk és ne kerüljenek tanításba | ⬜ Nincs megkötve — beszerzési/jogi feladat |

Az első kettő figyelmeztet, de nem akadályoz meg semmit: ha az ügyfél mégis beír egy ügyfélszámot, az kimegy.
Ezt a maradék kockázatot a PII-szűrő technikailag, a ZDR-szerződés szerződéses úton csökkenti — a kettő
egymást kiegészíti, nem helyettesíti.
