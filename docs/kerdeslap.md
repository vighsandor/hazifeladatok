# Kérdéslap — a PoC-ra adott válaszok

Minden válasz erre a konkrét PoC-ra vonatkozik, nem általánosságban az AI-ról. Ahol valami **nincs
megvalósítva**, azt kimondom.

---

## 1. Milyen személyes adat kerül a rendszerbe, és hol tűnik el vagy anonimizálódik?

A tudásbázisban **nincs személyes adat**: 20 nyilvános ETSI szabvány szövege van benne, chunkolva és
vektorizálva — publikus dokumentumok, PII nélkül. Az ügyfél oldaláról **egyetlen dolog érkezik: a kérdés
szövege**. A rendszer nem kér és nem tárol nevet, e-mailt, ügyfélszámot, IP-címet vagy munkamenet-azonosítót;
a `/support` oldalon egyetlen beviteli mező van, és a `POST /api/support/ask` végpont is csak a `question`
mezőt fogadja el. Ezért a fő védelem megelőző jellegű: az oldal tetején jól látható AI-jelölés és a
**„Kérjük, ne adj meg személyes vagy bizalmas adatot"** figyelmeztetés. Egy **PII-szűrő** a modellhívás előtt
technikailag megoldható, de **ma nincs megvalósítva** — ez nyitott döntés. A naplóba a kérdés szövege bekerül,
személyes azonosító viszont nem, mert olyat a rendszer nem is lát. Anonimizálás tehát nem történik: az az adat,
ami bejön, a kérdés maga — ezért számít, hogy mit ír bele az ügyfél (lásd A) kérdés).

## 2. Hol fut a modell, hova utazik az adat, és mi nem hagyja el a környezetünket?

A nyelvi modellek **nem nálunk futnak**, hanem az OpenAI és az Anthropic **USA-beli API-jain**. Oda a **kérdés
szövege** jut ki, valamint a kérdésből generált **HyDE-bekezdés** és a keresés által kiválasztott ETSI
szövegrészletek — utóbbiak nyilvános szabványszövegek. **Nálunk marad** a teljes tudásbázis, az 1 657 chunk
vektora a saját pgvector adatbázisunkban, a keresés maga (az teljes egészében a mi környezetünkben fut), az
interakciós napló (`logs/interactions.jsonl`) és az eszkalációs ticketek (`support/handoffs.jsonl`). A modellek
soha nem látják a tudásbázist mint egészet, csak a már kiválasztott néhány chunkot. A kiküldött kérdések
megőrzését a szolgáltatónál **enterprise / Zero-Data-Retention szerződéssel** lehet kizárni — ez **ma nincs
megkötve**, beszerzési és jogi feladat. A lépésenkénti részletes bontás: **`docs/adatterkep.md`**.

## 3. Melyik lépésnél hagy jóvá ember, mit lát, és mit tud visszavonni?

Az emberi kapu a **bizonytalanság-eszkaláció**, és ez nem opcionális lépés, hanem a folyamat része: a
`needsHuman` szabály eszkalál, ha a rendszer nem talált támaszt a kérdésre (`out_of_scope`), vagy ha talált
ugyan, de gyengét — **`topScore < 6`** a 0–10-es skálán (`low_confidence`). Ilyenkor az ügyfél nem kap
tartalmi választ, csak azt, hogy továbbítottuk egy szakemberhez, és egy hivatkozási számot. **A szakember
látja** a kérdést, az eszkaláció okát, a magabiztossági pontszámot és az időbélyeget a handoff-rekordban
(`support/handoffs.jsonl`) — és **ő maga válaszol**, a rendszer nem fogalmaz helyette. Visszavonásra nincs
szükség, mert **a rendszer semmilyen visszafordíthatatlan műveletet nem hajt végre az ügyfélen**: nem módosít
szerződést, nem indít folyamatot, nem küld ki dokumentumot — kizárólag szöveges tájékoztatást ad. A
visszavonható dolog maga a válasz, azt pedig az ügyintéző felül tudja írni.

## 4. Mi kerül naplóba, ki fér hozzá, meddig marad?

Interakciónként **egyetlen JSON sor** a `logs/interactions.jsonl`-ba: időbélyeg, a kérdés szövege, hogy
válaszolt-e vagy eszkalált (`mode`, eszkalációnál az okkal), a magabiztossági pontszám, a válaszidő
ezredmásodpercben és a felhasznált források száma. **A válasz szövegét nem naplózzuk** — csak azt, hogy hány
forrásra támaszkodott. Az eszkalációk külön fájlba, a `support/handoffs.jsonl`-ba kerülnek, a hivatkozási
számmal együtt. Hozzáférés: a folyamatgazda és az üzemeltetés — a fájlok a saját szerverünkön vannak, külső fél
nem fér hozzájuk. Megőrzés: **[ökölszám: 90 nap]** — ezt viszont ki kell mondani: **automatikus törlés ma nincs
implementálva**, a naplófájl korlátlanul nő. A 90 napos megőrzéshez egy forgatási/törlési lépést be kell
építeni, mielőtt élesbe megy.

## 5. Mi történik, ha az agent téved, és mennyi idő alatt áll vissza?

Három védelmi réteg van egymás mögött. Az első a **grounding**: a rendszer csak a tudásbázis chunkjaiból
válaszolhat, és minden állítás mellé oda kell tennie a konkrét ETSI klauzulát — a mért átlag **4,87
forrás-hivatkozás válaszonként** —, így a tévedés **ellenőrizhető**, nem rejtett. A második az **eszkaláció**,
ami a gyenge alátámasztottságú eseteket kiszűri, mielőtt válasz lenne belőlük. A harmadik a **heti szakértői
mintaellenőrzés**, ami a megválaszolt interakciókból mintát vesz — ez **új folyamat, ma nem működik**, a
pilottal együtt kell elindítani (`docs/meresi-terv.md`, 4. sor). Ha mégis rossz válasz megy ki: a **rollback a
`/support` bejárat kikapcsolása, ami percek alatt megvan**. Az ügyfél a mai csatornára esik vissza,
**adatvesztés nincs** (a napló és a tudásbázis a helyén marad), és a kollégák belső eszköze érintetlen, mert az
külön útvonalon fut. A konkrét hibás válasz javítása ennél lassabb: a naplóból azonosítható a kérdés, de a
javítás a tudásbázis vagy a küszöb módosítását jelenti, nem egy gomb megnyomását.

## 6. Ki lesz a gazda a bevezetés után, és miből látja, hogy jól működik?

A gazda az **ügyfélszolgálati folyamatgazda** — nem a fejlesztés, mert a rendszer az ügyfélszolgálati
folyamat része, nem önálló termék. Amiből dolgozik: az **`npm run report` heti összesítője**, ami a naplóból
számol, és a **`docs/meresi-terv.md`** metrikái. Konkrétan: a **válaszidő** (átlag és p90 — jelenleg mért
8 801 / 12 754 ms), a **deflektált arány** (válaszolt / összes interakció), az **eszkalációs arány** okonkénti
bontásban, és havonta a **téves-válasz mintaellenőrzés** eredménye. Az első három ma is mérhető, mert a
naplózás él; a negyedik az az új folyamat, amit a pilottal kell felállítani. A szponzor havi diát kap, a
compliance a mintaellenőrzés eredményét.

---

# A két kényes kérdés

## A) A kérdés szövege kimegy egy USA-beli szolgáltatóhoz. Mi garantálja, hogy az ügyfél nem ír bele személyes vagy bizalmas adatot, és mi történik, ha mégis?

**Semmi nem garantálja. Teljes garancia nincs — ezt nem akarom szépíteni.** A `/support` oldal tetején ott a
jelölés, hogy géppel beszél, és ott a kérés, hogy ne adjon meg személyes vagy bizalmas adatot — de ez
**figyelmeztetés, nem akadály**. Ha az ügyfél mégis beírja az ügyfélszámát vagy a szerződése részleteit, az
**kimegy** az USA-beli API-hoz, és **bekerül a naplónkba is**, mert a kérdés szövegét eltároljuk. Ez a maradék
kockázat ma valós, és nem tagadjuk. Két dolog csökkenti, és a kettő egymást kiegészíti, nem helyettesíti: egy
**PII-szűrő** a modellhívás előtt technikai úton kiszedné a felismerhető azonosítókat, a
**Zero-Data-Retention szerződés** pedig szerződéses úton zárná ki, hogy a kiküldött szöveg megmaradjon vagy
tanításba kerüljön a szolgáltatónál. **Egyik sincs ma megvalósítva** — mindkettő külön döntést és külön
ráfordítást igényel, és a pilot előtt érdemes legalább az egyikről dönteni. Amit ma kimondhatunk: a rendszer
nem *kér* személyes adatot, nem is *igényli* a működéséhez, és a hozzáférés a naplóhoz nálunk marad.

## B) A grounding csökkenti, de nem szünteti meg a hibát. Mi történik, ha az asszisztens magabiztosan rossz szabvány-értelmezést ad egy ügyfélnek, aki arra támaszkodik — és ki felel?

**Ez megtörténhet, és előbb-utóbb meg is fog.** A grounding a hibát ritkítja, nem szünteti meg: a rendszer a
helyes szabványrészletet is félreértelmezheti, vagy a keresés hozhat rossz klauzulát. Három dolog van ellene.
Először: **minden válasz mellett kötelező a forrás-hivatkozás**, kattintható ETSI-linkkel — az ügyfél és a
kollégánk **ellenőrizni tudja a szabványhelyen**, hogy a válasz valóban azt mondja-e. Ez a rendszer legfontosabb
tulajdonsága, és ezért éri meg a ~9–13 másodperces válaszidő. Másodszor: a **bizonytalan eseteket eszkaláljuk**
— ha a támasz gyenge, nem születik válasz. Harmadszor, és ez a lényeg: **jogilag és szakmailag a végső
felelősség a szolgáltatóé, azaz emberé — az asszisztens tájékoztat, nem dönt és nem ad kötelező érvényű
szakvéleményt.** Ezt az ügyfél felé is egyértelművé kell tenni, nem elrejtve az apró betűben. Ebből következik
egy korlát, amit érdemes vállalni: **a magas tétű kérdéseket emberhez kell irányítani** — ahol az ügyfél
döntése pénzbe, jogi következménybe vagy megfelelőségi kockázatba kerül, ott a gyorsaság nem ér annyit, mint a
felelős emberi válasz. A rendszer ma ezt a szűrést **magabiztosság alapján** végzi (`topScore < 6`), nem a
kérdés tétje alapján; ha a pilot azt mutatja, hogy ez nem elég, a tét szerinti irányítást külön be kell építeni.
