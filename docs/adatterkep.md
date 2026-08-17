# Adattérkép — egy ügyfélkérés teljes útja

Ebben a dokumentumban végigkövetem, hogy egy ügyfél kérdéséből **milyen adat, hova, mikor** kerül — a `/support`
oldalon való begépeléstől a válaszig vagy az emberi eszkalációig. A célom, hogy egyetlen ránézésre látszódjon,
mi marad a saját környezetemben, és mi hagyja el azt.

| Lépés | Milyen adat | Hova megy (szolgáltató, régió) | Nálam marad? | Naplózom? |
|---|---|---|---|---|
| **1. Ügyfél kérdése a `/support`-on** | a kérdés nyers szövege | sehova — nálam keletkezik, a saját webszerveremen | ✅ igen | ✅ igen (`logs/interactions.jsonl`) |
| **2. HyDE — hipotetikus válasz** | **a kérdés teljes szövege** promptban | OpenAI, `gpt-4o-mini` — **USA** | ❌ kilép | csak a tény és a válaszidő, a prompt nem |
| **3. Embedding** | a HyDE által generált bekezdés (a kérdésből származtatva, nem a nyers kérdés) | OpenAI, `text-embedding-3-small` — **USA** | ❌ kilép | nem |
| **4. Keresés a vektor-adatbázisban** | lekérdező vektor + a nyilvános ETSI chunkok | saját pgvector/Postgres — **a saját környezetem** | ✅ igen | nem (csak a találatok száma közvetve) |
| **5. Rerank** | **a kérdés** + a 20 jelölt ETSI chunk szövege | Anthropic, `claude-haiku-4-5` — **USA** | ❌ kilép | csak a legjobb pontszám (`topScore`) |
| **6. Válasz generálása** | **a kérdés** + a top-5 ETSI chunk szövege | Anthropic, `claude-sonnet-4-5` — **USA** | ❌ kilép | a válasz nem; a forrás-szám igen |
| **7. Handoff bizonytalanság esetén** | handoff id, a kérdés, ok (`out_of_scope` / `low_confidence`), `topScore`, időbélyeg | sehova — a saját rendszerem (`support/handoffs.jsonl`) | ✅ igen | ✅ igen |

## Ami nálam marad

- **A tudásbázis** — a 20 ETSI szabvány szövege, chunkolva (`knowledge_chunks`).
- **A vektorok** — az 1 657 chunk embeddingje a saját pgvector adatbázisomban.
- **`logs/interactions.jsonl`** — az interakciós napló.
- **`support/handoffs.jsonl`** — az emberi eszkalációk sora.

Ezek egyike sem hagyja el a saját környezetemet: a keresés teljes egészében nálam fut, a modellek csak a
kérdést és a *már kiválasztott* chunkokat látják, a tudásbázist mint egészet soha.

## Amit naplózok

Interakciónként egyetlen JSON sort írok, pontosan ezekkel a mezőkkel:

- **időbélyeg** (`ts`, ISO)
- **a kérdés szövege** (`question`)
- **válaszolt vagy eszkalált** (`mode`: `answer` / `handoff`, eszkalációnál `reason`)
- **magabiztosság** (`topScore` — a rerank legjobb pontszáma, 0–10)
- **válaszidő** (`latencyMs`)
- **forrás-szám** (`sourcesCount`)

A **válasz szövegét nem naplózom**, csak azt, hogy hány forrásra támaszkodott.

## Amit sosem küldök ki szándékosan

- **Az ügyfél személyes azonosítóit** — a rendszerem nem kér és nem továbbít nevet, e-mailt, ügyfélszámot,
  IP-címet vagy munkamenet-azonosítót; a modellhívások kizárólag a kérdés szövegét és ETSI-szövegrészleteket
  tartalmaznak.
- **A tudásbázis maga nyilvános** — az ETSI szabványok szabadon letölthetők, tehát a 4–6. lépésben kiküldött
  chunkok nem üzleti titkot, hanem publikus szabványszöveget hordoznak.

## A fő adat-kilépési pont

**Ki kell mondanom: a kérdés szövege elhagyja a saját környezetemet, és az USA-beli OpenAI és Anthropic
API-khoz jut** (a 2., 5. és 6. lépésben). Ez a rendszerem működésének feltétele, nem mellékhatás — és mivel a
kérdést az ügyfél írja, elvileg bármit beleírhat, akár olyat is, amit nem kellene.

Mérséklés, a jelenlegi állapot szerint:

| Intézkedés | Állapot |
|---|---|
| **AI-jelölés** a `/support` oldal tetején — az ügyfél tudja, hogy géppel beszél | ✅ megvalósítva |
| **„Kérjük, ne adj meg személyes vagy bizalmas adatot"** — ugyanabban a jól látható sávban | ✅ megvalósítva |
| **PII-szűrő** a kérdésen, a modellhívás előtt (opcionális) | ⬜ nincs megvalósítva — döntést igényel |
| **Enterprise / Zero-Data-Retention szerződés** a szolgáltatókkal, hogy a kérdések ne maradjanak meg náluk és ne kerüljenek tanításba | ⬜ nincs megkötve — beszerzési/jogi feladat |

Az első kettő figyelmeztet, de nem akadályoz meg semmit: ha az ügyfél mégis beír egy ügyfélszámot, az kimegy.
Ezt a maradék kockázatot a PII-szűrő technikailag, a ZDR-szerződés szerződéses úton csökkenti — a kettő egymást
kiegészíti, nem helyettesíti.
