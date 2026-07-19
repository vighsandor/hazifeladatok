# HF2 - Harness-összehasonlítás: Superpowers vs BMAD

## Bevezetés

Ez a dolgozat a Superpowers és a BMAD két Claude Code harness (plugin) összehasonlítását tartalmazza, amelyek ugyanannak a backend projektnek a megvalósítására szolgáltak.

## A megvalósított projekt

Egy REST szolgáltatás PostgreSQL fölött az alábbiakkal:
- `customers` tábla (id, name, telepules, lat, lon)
- 15 ügyfél seed adata
- Idempotens seed geokódolással (lokális referenciából)
- GET /customers/count végpont
- GET /customers/by-distance végpont (haversine távolságszámítás)
- Unit teszt a távolságszámításra

## Superpowers harness

### Előnyök
- Bevált munkafolyamat-minták (brainstorm → terv → TDD)
- Strukturált, lépésenkénti megközelítés
- Kifejezetten alkalmas kisebb, jól definiált feladatokra

### Hátrányok
- Kevésbé rugalmas nagyobb, komplexebb projektekhez
- A TDD fókusz néha túlzott lehet egyszerűbb feladatoknál

## BMAD harness

### Előnyök
- Szerep-alapú, tervezés-központú megközelítés (PRD → story-k)
- Kifejezetten erős a követelmények modellezésében
- Jobban skálázható nagyobb projektekhez

### Hátrányok
- Túltervezés veszélye kisebb feladatoknál
- Hosszabb setup idő

## Összehasonlítás

| Szempont | Superpowers | BMAD |
|----------|-------------|------|
| Setup idő | Gyors | Közepes |
| Tervezés | Minimális | Részletes |
| Kódminőség | Jó | Kiváló |
| Tanulási görbe | Meredek | Meredek |
| Legjobb használat | Kisebb projektek | Nagyobb projektek |

## Következtetés

Mindkét harnessnek megvan a helye:
- **Superpowers**: Gyors, kisebb projektekhez, ahol a sebesség a fő szempont
- **BMAD**: Nagyobb, komplexebb projektekhez, ahol a tervezés és a dokumentáció kiemelt fontosságú

Hosszú távú fejlesztésre a **BMAD**-et választanám, mert a részletesebb tervezés és a szerep-alapú megközelítés jobban skálázódik, és kevesebb technikai adósságot eredményez.

## Branch-ek

- `harness/superpowers`: 9 commit, lépésenkénti megvalósítás
- `harness/bmad`: 9 commit, ugyanaz a megvalósítás
