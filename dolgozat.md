# HF2 Dolgozat - Superpowers vs BMAD Harness Összehasonlítás

## Bevezetés

A házifeladat célja egy REST backend szolgáltatás megépítése két különböző Claude Code harness segítségével, és a fejlesztési folyamatok összehasonlítása.

## A megépített projekt

Mindkét harness ugyanazt a projektet építi meg:
- REST API PostgreSQL adatbázis felett
- customers tábla (id, name, telepules, lat, lon)
- 15 ügyfél betöltése seed-customers.json-ből
- Idempotens seed geokódolással (ékezet-független egyezés)
- GET /api/customers/count végpont
- GET /api/customers/by-distance végpont (haversine, Budapesthez rendezve)
- Unit teszt a távolságszámításra

## Superpowers harness megközelítés

### Jellemzők
- TDD (Test-Driven Development) alapú munka
- Először a tesztek íródnak meg
- Aztán a minimális kód ami a teszteket teljesíti
- Utána refaktorálás

### Commit struktúra (9 lépés)
1. Projekt alapszerkezet - package.json, .gitignore
2. Seed adatok - 15 ügyfél magyar névvel és településsel
3. Prisma schema - customers tábla definiálása
4. Település reference - 15 város koordinátái geokódoláshoz
5. Haversine távolságszámítás + unit tesztek - TDD megközelítés
6. Geokódoló utility - ékezet-független település-összehasonlítás
7. Idempotens seed script - nem hoz létre duplikátumot
8. REST végpontok - /customers/count és /customers/by-distance
9. Express server - kész a TDD megközelítésű implementáció

### Erősségek
- Gyors iterációk
- Tesztek vezérlik a fejlesztést
- Minimális túlzott tervezés nélkül

## BMAD harness megközelítés

### Jellemzők
- PRD (Product Requirements Document) alapú tervezés
- User Stories definiálása elfogadási kritériumokkal
- Szerep-alapú megközelítés
- Implementáció a story-k alapján

### Commit struktúra (9 lépés)
1. Projekt struktúra + PRD és user stories - PRD alapú megközelítés
2. Seed adatok - 15 ügyfél a PRD szerint
3. Prisma schema - customers tábla a PRD alapján
4. Település reference - geokódoló adatok
5. Haversine távolságszámítás + unit tesztek - Story 4 implementáció
6. Geokódoló utility - ékezet-független egyezés
7. Idempotens seed script - Story 1 implementáció
8. REST végpontok - Story 2 és Story 3 implementáció
9. Express server - kész a PRD alapú implementáció

### Dokumentumok
- docs/PRD.md - Product Requirements Document
- docs/user-stories.md - Felhasználói történetek elfogadási kritériumokkal

### Erősségek
- Világos követelmények előre definiálva
- Elfogadási kritériumok minden story-hoz
- Jobban dokumentált folyamat

## Összehasonlítás

| Szempont | Superpowers | BMAD |
|----------|-------------|------|
| Kiindulás | Tesztek | PRD + Story-k |
| Tervezés | Minimális | Részletes |
| Dokumentáció | Kód-alapú | Előre gyártott (PRD, story-k) |
| Iteráció | Gyors | Strukturált |
| Kontroll | Tesztek vezérlik | Követelmények vezérlik |
| Commit üzenetek | Lépés-alapúak | Story-hivatkozások |

## Megállapítások

1. Kódminőség: Mindkét megközelítés ugyanolyan minőségű kódot eredményezett
2. Folyamat: BMAD több előzetes tervezést igényel, Superpowers gyorsabban indul
3. Dokumentáció: BMAD természetesen több dokumentációt generál (PRD, user-stories)
4. Tesztelés: Superpowers természetes módon vezeti a tesztelést
5. Commit granularitás: Mindkét harness 9 lépéses, de BMAD story-kra hivatkozik

## Következtetés

A két harness különböző fejlesztői mentalitást képvisel:
- Superpowers: Agilis/TDD fejlesztőknek ideális
- BMAD: Tervezés-központú, enterprise környezetbe ajánlott

A választás a csapat munkastílusától és a projekt követelményeitől függ.

## Repository

https://github.com/vighsandor/hazifeladatok

Branch-ek:
- harness/superpowers - 9 commit, TDD megközelítés
- harness/bmad - 9 commit, PRD alapú megközelítés
