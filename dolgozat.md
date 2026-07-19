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
- **TDD (Test-Driven Development)** alapú munka
- Először a tesztek íródnak meg
- Aztán a minimális kód ami a teszteket teljesíti
- Utána refaktorálás

### Commit struktúra (9 lépés)
1. Projekt struktúra létrehozása
2. Seed adatok hozzáadása (15 ügyfél)
3. Prisma schema definiálása
4. Település reference (geokódoláshoz)
5. Haversine távolságszámítás + unit tesztek
6. Geokódoló utility
7. Idempotens seed script
8. REST végpontok implementációja
9. Server és konfiguráció

### Erősségek
- Gyors iterációk
- Tesztek vezérlik a fejlesztést
- Minimális túlzott tervezés nélkül

## BMAD harness megközelítés

### Jellemzők
- **PRD (Product Requirements Document)** alapú tervezés
- **User Stories** definiálása elfogadási kritériumokkal
- Szerep-alapú megközelítés
- Implementáció a story-k alapján

### Commit struktúra (9 lépés)
1. Projekt struktúra + PRD és user stories dokumentumok
2. Seed adatok hozzáadása
3. Prisma schema definiálása
4. Település reference
5. Haversine távolságszámítás + unit tesztek
6. Geokódoló utility
7. Idempotens seed script
8. REST végpontok implementációja
9. Server és konfiguráció

### Erősségek
- Világos követelmények előre definiálva
- Elfogadási kritériumok minden story-hoz
- Jobban dokumentált folyamat

## Összehasonlítás

| Szempont | Superpowers | BMAD |
|----------|-------------|------|
| Kiindulás | Tesztek | PRD + Story-k |
| Tervezés | Minimális | Részletes |
| Dokumentáció | Kód-alapú | Előre gyártott |
| Iteráció | Gyors | Strukturált |
| Kontroll | Tesztek vezérlik | Követelmények vezérlik |

## Megállapítások

1. **Kódminőség**: Mindkét megközelítés ugyanolyan minőségű kódot eredményezett
2. **Folyamat**: BMAD több előzetes tervezést igényel, Superpowers gyorsabban indul
3. **Dokumentáció**: BMAD természetesen több dokumentációt generál
4. **Tesztelés**: Superpowers természetes módon vezeti a tesztelést

## Következtetés

A két harness különböző fejlesztői mentalitást képvisel:
- **Superpowers**: Agilis/TDD fejlesztőknek ideális
- **BMAD**: Tervezés-központú, enterprise környezetbe ajánlott

A választás a csapat munkastílusától és a projekt követelményeitől függ.
