# Mérési terv — ügyfélszolgálati AI-asszisztens

Ebben a tervben rögzítem, hogy az asszisztensem bevezetése után **mit mérek, milyen adatból, milyen ritmusban
és kinek riportálom** — úgy, hogy az ügyfélszolgálat fájdalmait és az agent saját hibáit külön tudjam követni.

| Mit mérek | Honnan lesz adat | Hogyan riportálom | Kinek |
|---|---|---|---|
| **1. Válaszidő az ügyfél felé** (#1 fájdalom) | `logs/interactions.jsonl` → `latencyMs` mező, minden interakcióra | `npm run report` — átlag és p90, **hetente** | folyamatgazda |
| **2. Deflektált / önkiszolgálási arány** (#2 fájdalom) | ugyanaz a napló → `mode` mező: `answer` / összes | `npm run report` — válaszolt/összes, **hetente** | folyamatgazda |
| **3. Eszkalációs arány** — az agent **korlátját** méri | ugyanaz a napló → `handoff` / összes, `reason` bontásban | havi dia (a heti riportokból aggregálva) | szponzor |
| **4. Téves válaszok aránya** — az agent **hibáját** méri | heti **N** megválaszolt interakció szakértői mintaellenőrzése ⟵ **új folyamat, ma még nem mérem** | havi összesítés a mintavétel eredményéről | compliance |
| **5. Konzisztencia** (#9 fájdalom: ugyanaz a kérdés → ugyanaz a forrás) | időszakos konzisztencia-ellenőrzés a golden set kérdésekre ⟵ **új, kis scriptet kell írnom hozzá** | havonta — hány kérdésnél tér el a hivatkozott forrás | folyamatgazda |

A **fájdalom-metrikák (1, 2, 5)** azt mérik, javult-e az ügyfélszolgálat helyzete. A **hiba-metrikák (3, 4)** azt
mérik, hol téved vagy hol nem elég az agent. A kettőt nem keverem össze: a 3. sor magas értéke nem feltétlenül
rossz hír (az agent felismerte a korlátját), a 4. soré viszont mindig az.

## Mért aktuális értékek

Az 1–3. sor adata **ma is gyűjthető**, mert a naplózás él. A `docs/meresi-adatok.txt` pillanatkép (24 interakció):

| Metrika | Mért érték |
|---|---|
| Eszkalációs arány | **37,5%** (9 handoff / 24 interakció; ebből 8 `out_of_scope`, 1 `low_confidence`) |
| Átlagos válaszidő | **8 801 ms** |
| p90 válaszidő | **12 754 ms** |
| Átlagos forrás/válasz | **4,87** |

Két dolgot mindig odaolvasok ezek mellé. Egyrészt ez **nem valós ügyfélforgalom**: a mintát a
`npm run seed:traffic` állította elő, amelyben szándékosan 5 hatókörön kívüli kérdés is szerepel, tehát a 37,5%
felülről torzított — éles forgalomra a bevezetés után újramérem. Másrészt 24 interakció **kevés** statisztikai
következtetéshez; ezeket indulási referenciának tekintem, nem célszámnak.

## A válaszidőről őszintén

A válaszidő **~9–13 másodperc** — ez lassabb, mint amit egy chat-felülettől megszoktunk, és nem akarom szépíteni.
Ez **a forrásmegjelölt, ellenőrizhető válasz ára**: egy kérdés négy modellhívást futtat végig (HyDE → embedding
→ rerank → grounded válasz), és épp ez adja azt, amiért az egészet csináltam — hogy a válasz mellett ott legyen
a konkrét ETSI klauzula, amit az ügyintéző vagy az ügyfél ellenőrizni tud. Egy forrás nélküli, egylépéses válasz
2 másodperc alatt megvan, de pont azt nem tudja, ami itt a lényeg.

Optimalizálási irányok, ha a válaszidő szűk keresztmetszetté válik:

- **Streaming** — a válasz első szava ~2–3 másodpercen belül megjelenhet a felületen, így az érzékelt várakozás
  töredékére csökken, miközben a teljes futásidő nem változik. Ez a legolcsóbb és leglátványosabb lépés.
- **Gyakori kérdések cache-elése** — a bejövő kérdések jelentős része ismétlődik; a kérdés (vagy az embeddingje)
  alapján gyorsítótárazott válasz a teljes pipeline-t megspórolja. A naplóból ki tudom mutatni, mely kérdések
  térnek vissza rendszeresen.
- **Kisebb válaszmodell** — a záró generálás ma Claude Sonnet 4.5; egy kisebb modell érdemben gyorsabb, cserébe
  a válaszminőséget a golden seten kell újramérnem, mielőtt élesbe menne.

## Mi hiányzik még

| Sor | Állapot | Mi kell hozzá |
|---|---|---|
| 1., 2., 3. | ✅ Ma is mérhető | Semmi — a `logs/interactions.jsonl` és a `npm run report` már működik |
| 4. Téves válaszok | ❌ Nincs adatgyűjtés | Mintavételi folyamat: heti N interakció kiválasztása, szakértői értékelő űrlap, az eredmény visszavezetése |
| 5. Konzisztencia | ❌ Nincs adatgyűjtés | Kis script: a golden set kérdéseit időszakosan újrafuttatja, és összeveti a hivatkozott forrásokat a korábbi futással |

A 4. sor emberi folyamat (szakértői ítélet nélkül nem mérhető), az 5. sort viszont automatizálni tudom — a
golden set már megvan (`docs/golden-set.md`), a scriptnek tehát elég ezeket a kérdéseket újrafuttatnia és a
válaszok forrásait futásról futásra összevetnie.

Egy megkötést kimondok ehhez: a napló ma a források **számát** rögzíti (`sourcesCount`), magukat a hivatkozott
klauzulákat nem. A konzisztencia-script ezért vagy saját maga tárolja el a futásai eredményét, vagy a
`logInteraction` eseményt kell kiegészítenem a forrás-azonosítók listájával. Utóbbi a kevesebb munka, viszont
tudatos döntést kíván, mert bővül vele az, amit a naplóba írok.
