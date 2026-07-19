# Rendszerprompt — a javítás indoklása

Ez a dokumentum a `docs/system-prompt-baseline.md` → `docs/system-prompt.md`
(élesben futó, `packages/core/src/prompt.ts`) fejlesztéseit indokolja. A cél a
**text-to-SQL helyesség** növelése és a **hallucináció** csökkentése, a stackhez és a
biztonsági modellhez illesztve.

> Megjegyzés a reprodukcióról: az eredeti `system-prompt.md` nem állt rendelkezésre, ezért a
> baseline rekonstruált. A "javított" változat az, amit az agent ténylegesen futtat — ez a
> lényegi leadandó, a mérhető minőségjavulás ezen mérhető.

## Konkrét változtatások és miért

1. **Teljes séma beágyazása a promptba** (oszlopok + típusok).
   _Miért:_ a modell nem talál ki nem létező oszlopot/táblát; a generált SQL első
   próbálkozásra futtatható. Ez közvetlenül csökkenti a "hallucinált oszlop" arányát.

2. **Kötött szókészletek kimondása** (`size_category`, `light_need`, `water_frequency`,
   `care_level` megengedett magyar értékei).
   _Miért:_ a magyar nyelvű szűrés determinisztikus lesz (pl. „erős fényigény” → `light_need
= 'erős'`), nem talál ki szinonimát, ami üres találatot adna.

3. **Kötelező `list_categories` kategóriaszűrés előtt.**
   _Miért:_ a kategórianevek adatfüggők; ha a modell találgat, hibás/üres szűrés lesz. A
   tool a VALÓS kategóriákat adja — ez a legfontosabb anti-hallucináció lépés, és pont a
   kötelező saját toolt teszi a munkafolyamat részévé.

4. **Explicit csak-olvasó SQL-szabályok** (csak `SELECT`/`WITH`, egyetlen utasítás, nincs
   záró `;`).
   _Miért:_ biztonság és kiszámíthatóság. Illeszkedik a **read-only DB role**-hoz és az
   `sql-guard`-hoz — réteges védelem (a prompt terel, a kód és a DB kikényszerít).

5. **`ILIKE '%...%'` + kötelező `LIMIT`.**
   _Miért:_ a szöveges keresés kis/nagybetűtől független és robusztus lesz; a `LIMIT`
   korlátozza a találatszámot (teljesítmény és józan válaszméret). Ez a stack-konvenció.

6. **Válasznyelv és stílus** (alapból magyar, tömör, Ft/cm, ne dobja ki a nyers SQL-t).
   _Miért:_ önkiszolgáló, felhasználóbarát élmény — ez adja a ROI-ban feltételezett
   „2 perc/kérdés”-t. Nyers sortömeg helyett emberi összefoglaló.

7. **„Csak a tool-adatokra hagyatkozz, ne találj ki adatot.”**
   _Miért:_ a katalógus az egyetlen igazságforrás; a modell belső „növény-tudása” nem a
   készletünk. Ez a text-to-SQL helyesség sarokköve.

8. **Nincs-találat kezelése** (mondd ki, és javasolj lazább feltételt).
   _Miért:_ hasznosabb, kevésbé frusztráló válasz; elkerüli, hogy a modell „kitaláljon”
   valamit, csak hogy ne térjen vissza üresen.

## Várt hatás (mérhető)

- **↑ Text-to-SQL first-try helyesség** (séma + szabályok miatt).
- **↓ Hallucinált oszlop/kategória** (séma beágyazás + kötelező `list_categories`).
- **↑ Biztonság** (prompt + kód + DB három rétege ugyanazt mondja).
- **↑ Használhatóság** (magyar, tömör, összefoglaló válaszok).
