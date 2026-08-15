# Mérési terv — ügyfélszolgálati AI-asszisztens

Ez a terv rögzíti, hogy az asszisztens bevezetése után **mit mérünk, milyen adatból, milyen ritmusban és kinek
riportáljuk** — úgy, hogy az ügyfélszolgálat fájdalmai és az agent saját hibái külön követhetők legyenek.

| Mit mérünk | Honnan lesz adat | Hogyan riportáljuk | Kinek |
|---|---|---|---|
| **1. Válaszidő az ügyfél felé** (#1 fájdalom) | `logs/interactions.jsonl` → `latencyMs` mező, minden interakcióra | `npm run report` — átlag és p90, **heti** | Folyamatgazda |
| **2. Deflektált / önkiszolgálási arány** (#2 fájdalom) | Ugyanaz a napló → `mode` mező: `answer` / összes | `npm run report` — válaszolt/összes, **heti** | Folyamatgazda |
| **3. Eszkalációs arány** — az agent **korlátját** méri | Ugyanaz a napló → `handoff` / összes, `reason` bontásban | Havi dia (a heti riportokból aggregálva) | Szponzor |
| **4. Téves válaszok aránya** — az agent **hibáját** méri | Heti **N** megválaszolt interakció szakértői mintaellenőrzése ⟵ **ÚJ folyamat, ma nem mérjük** | Havi összesítés a mintavétel eredményéről | Compliance |
| **5. Konzisztencia** (#9 fájdalom: ugyanaz a kérdés → ugyanaz a forrás) | Időszakos konzisztencia-ellenőrzés a golden set kérdésekre ⟵ **ÚJ, kis script kell** | Havi — hány kérdésnél tér el a hivatkozott forrás | Folyamatgazda |

**Fájdalom-metrika (1, 2, 5)** — azt mérik, javult-e az ügyfélszolgálat helyzete.
**Hiba-metrika (3, 4)** — azt mérik, hol téved vagy hol nem elég az agent.
A kettőt nem szabad összekeverni: a 3. sor magas értéke nem feltétlenül rossz hír (az agent felismerte a
korlátját), a 4. soré viszont mindig az.

## Mért aktuális értékek

Az 1–3. sor adata **ma is gyűjthető**, mert a naplózás él. A `docs/meresi-adatok.txt` pillanatkép (24 interakció):

| Metrika | Mért érték |
|---|---|
| Eszkalációs arány | **37,5 %** (9 handoff / 24 interakció; ebből 8 `out_of_scope`, 1 `low_confidence`) |
| Átlagos válaszidő | **8 801 ms** |
| p90 válaszidő | **12 754 ms** |
| Átlagos forrás/válasz | **4,87** |

Két dolgot érdemes az értékek mellé odaolvasni. Egyrészt ez **nem valós ügyfélforgalom**: a mintát a
`npm run seed:traffic` állította elő, amelyben szándékosan 5 hatókörön kívüli kérdés is szerepel, tehát a 37,5 %
felülről torzított — éles forgalomra a bevezetés után kell újramérni. Másrészt 24 interakció **kevés**
statisztikai következtetéshez; ezek indulási referenciaértékek, nem célszámok.

## A válaszidőről őszintén

A válaszidő **~9–13 másodperc** — ez lassabb, mint amit egy chat-felülettől megszoktunk, és nincs értelme
szépíteni. Ez **a forrásmegjelölt, ellenőrizhető válasz ára**: egy kérdés négy modellhívást futtat végig
(HyDE → embedding → rerank → grounded válasz), és épp ez adja azt, amiért az egész rendszer készült — hogy a
válasz mellett ott legyen a konkrét ETSI klauzula, amit az ügyintéző vagy az ügyfél ellenőrizni tud.
Egy forrás nélküli, egylépéses válasz 2 másodperc alatt megvan, de pont azt nem tudja, ami itt a lényeg.

Optimalizálási irányok, ha a válaszidő szűk keresztmetszetté válik:

- **Streaming** — a válasz első szava ~2–3 másodpercen belül megjelenhet a felületen, így az érzékelt
  várakozás töredékére csökken, miközben a teljes futásidő nem változik. A legolcsóbb és leglátványosabb lépés.
- **Gyakori kérdések cache-elése** — a bejövő kérdések jelentős része ismétlődik; a kérdés (vagy annak
  embeddingje) alapján gyorsítótárazott válasz a teljes pipeline-t megspórolja. Ehhez a naplóból kimutatható,
  mely kérdések térnek vissza rendszeresen.
- **Kisebb válaszmodell** — a záró generálás ma Claude Sonnet 4.5; egy kisebb modell érdemben gyorsabb, cserébe
  a válaszminőséget a golden seten kell újramérni, mielőtt ez élesbe menne.

## Mi hiányzik még

| Sor | Állapot | Mi kell hozzá |
|---|---|---|
| 1., 2., 3. | ✅ Ma is mérhető | Semmi — a `logs/interactions.jsonl` és a `npm run report` már működik |
| 4. Téves válaszok | ❌ Nincs adatgyűjtés | Mintavételi folyamat: heti N interakció kiválasztása, szakértői értékelő űrlap, az eredmény visszavezetése |
| 5. Konzisztencia | ❌ Nincs adatgyűjtés | Kis script: a golden set kérdéseit időszakosan újrafuttatja, és összeveti a hivatkozott forrásokat a korábbi futással |

A 4. sor emberi folyamat (szakértői ítélet nélkül nem mérhető), az 5. sor viszont automatizálható — a golden set
már megvan (`docs/golden-set.md`), a scriptnek tehát elég ezeket a kérdéseket újrafuttatnia és a válaszok
forrásait futásról futásra összevetnie.

Egy megkötés ehhez: a napló ma a források **számát** rögzíti (`sourcesCount`), magukat a hivatkozott
klauzulákat nem. A konzisztencia-script ezért vagy saját maga tárolja el a futásai eredményét, vagy a
`logInteraction` eseményt kell kiegészíteni a forrás-azonosítók listájával. Utóbbi a kevesebb munka, viszont
tudatos döntést kíván: azzal bővül, amit a naplóba írunk.
