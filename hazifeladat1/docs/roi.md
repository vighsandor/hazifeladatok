# ROI — megtérülés pénzben (5 fős iroda)

Ez a számítás egy **5 fős iroda** (pl. egy növény-webshop / kertészet ügyfélszolgálati és
értékesítési csapata) esetére vezeti le a plantbase text-to-SQL agent megtérülését. Minden
feltevés explicit és szándékosan óvatos; a végén érzékenységvizsgálat is szerepel.

## Kiindulási feltevések

| Paraméter                                   | Érték          | Megjegyzés                                             |
| ------------------------------------------- | -------------- | ------------------------------------------------------ |
| Csapatlétszám                               | 5 fő           |                                                        |
| Ad-hoc "adatból megnézöm" kérdés / fő / hét | 4              | pl. „mi van készleten X alatt?”, „macskabarát pálmák?” |
| Kérdések összesen / hét                     | 20             | 5 × 4                                                  |
| Jelenlegi átfutás / kérdés                  | ~30 perc       | várni kell az elemzőre / kézzel keresgélni             |
| plantbase-szel / kérdés                     | ~2 perc        | kérdés magyarul → azonnali válasz                      |
| Munkahét                                    | 47 hét / év    | szabadságokkal, ünnepekkel korrigálva                  |
| Terhelt órabér (blended)                    | 8 000 Ft / óra | bér + járulék + rezsi együtt                           |

## Időmegtakarítás

- Jelenlegi ráfordítás: 20 kérdés × 30 perc = **600 perc/hét = 10,0 óra/hét**
- plantbase-szel: 20 × 2 perc = 40 perc/hét ≈ **0,67 óra/hét**
- **Megtakarítás ≈ 9,3 óra/hét**

## Megtakarítás pénzben (haszon oldal)

| Időtáv            | Megtakarított óra | Érték (8 000 Ft/h) |
| ----------------- | ----------------- | ------------------ |
| Hét               | 9,3               | **74 400 Ft**      |
| Hónap (≈4,33 hét) | ~40               | **~322 000 Ft**    |
| Év (47 hét)       | ~437              | **~3 496 000 Ft**  |

## Költségek

| Tétel                         | Összeg            | Jelleg                              |
| ----------------------------- | ----------------- | ----------------------------------- |
| LLM (Anthropic API) használat | ~20 000 Ft/hó     | változó, forgalomarányos            |
| Infrastruktúra (DB/hosting)   | ~10 000 Ft/hó     | fix                                 |
| **Havi működési költség**     | **~30 000 Ft/hó** |                                     |
| Egyszeri kiépítés             | ~192 000 Ft       | 2 fejlesztő-nap × 8 óra × 12 000 Ft |

> Az LLM-költség becslése: egy kérdés jellemzően néhány modell-kör + tool-hívás,
> ~pár ezer token. 20 kérdés/hét mellett a havi token-költség bőven a fenti keret alatt marad;
> 20 000 Ft/hó konzervatív felső becslés.

## Nettó megtérülés

- **Havi nettó haszon ≈ 322 000 − 30 000 = ~292 000 Ft/hó**
- **Éves nettó haszon ≈ 3 496 000 − 360 000 = ~3 136 000 Ft/év**
- **Megtérülési idő (payback):** 192 000 Ft egyszeri költség / ~292 000 Ft havi nettó
  ≈ **~0,7 hónap (kb. 3 hét)**
- **Első éves ROI:** (3 136 000 − 192 000) / (192 000 + 360 000) ≈ **~5,3× (≈ 530%)**

## Hard vs. soft ROI

| Kategória | Tétel                                                                    | Hatás                             |
| --------- | ------------------------------------------------------------------------ | --------------------------------- |
| **Hard**  | elemzői/ügyintézői idő megtakarítása                                     | ~292 000 Ft/hó                    |
| **Hard**  | gyorsabb ügyfélválasz → több lezárt eladás                               | (óvatosságból nem számszerűsítve) |
| **Soft**  | önkiszolgáló adathozzáférés, kevesebb „szűk keresztmetszet” az elemzőnél | nagy                              |
| **Soft**  | kevesebb hibás/kézi lekérdezés (kötött séma + read-only)                 | közepes                           |
| **Soft**  | betanulás gyorsul (magyar nyelvű kérdés, nem kell SQL)                   | közepes                           |

## Érzékenységvizsgálat

| Forgatókönyv | Kérdés/hét | Idő most | Órabér    | Havi nettó haszon |
| ------------ | ---------- | -------- | --------- | ----------------- |
| Konzervatív  | 12         | 20 perc  | 6 000 Ft  | ~120 000 Ft/hó    |
| Alap         | 20         | 30 perc  | 8 000 Ft  | ~292 000 Ft/hó    |
| Optimista    | 30         | 35 perc  | 10 000 Ft | ~600 000 Ft/hó    |

Még a konzervatív esetben is **1–2 hónap alatt megtérül** az egyszeri kiépítés.

## Kapcsolat a projekt KPI-jaival

A megtérülés fenntarthatóságát két minőségi mutató védi, amelyekre a rendszer kifejezetten
optimalizál:

- **Text-to-SQL helyesség** (a `run_sql` valós, futtatható SELECT-et ad a kérdésre),
- **Hallucinált oszlop/kategória aránya ~0** (a promptba ágyazott séma + a kötelező
  `list_categories` tool ezt minimalizálja).

Ha ezek romlanak, a „2 perc/kérdés” feltevés sérül — ezért van rájuk kapuőr, teszt és a
read-only DB-réteg.
