# Kérdéslap — a PoC-omra adott válaszok

Minden válaszom erre a konkrét PoC-ra vonatkozik, nem általánosságban az AI-ra. Ahol valami **nincs
megvalósítva**, azt kimondom.

---

## 1. Milyen személyes adat kerül a rendszerbe, és hol tűnik el vagy anonimizálódik?

A tudásbázisomban **nincs személyes adat**: 20 nyilvános ETSI szabvány szövege van benne, chunkolva és
vektorizálva — publikus dokumentumok, PII nélkül. Az ügyfél oldaláról **egyetlen dolog érkezik: a kérdés
szövege**. A rendszerem nem kér és nem tárol nevet, e-mailt, ügyfélszámot, IP-címet vagy munkamenet-azonosítót;
a `/support` oldalon egyetlen beviteli mező van, és a `POST /api/support/ask` végpont is csak a `question`
mezőt fogadja el. Ezért a fő védelmem megelőző jellegű: az oldal tetején jól látható AI-jelölés és a **„Kérjük,
ne adj meg személyes vagy bizalmas adatot"** figyelmeztetés. Egy **PII-szűrőt** a modellhívás előtt technikailag
meg tudok oldani, de **ma nincs megvalósítva** — ez nyitott döntés. A naplóba a kérdés szövege bekerül, személyes
azonosító viszont nem, mert olyat a rendszerem nem is lát. Anonimizálás tehát nem történik: az az adat, ami
bejön, a kérdés maga — ezért számít, hogy mit ír bele az ügyfél (lásd az A) kérdést).

## 2. Hol fut a modell, hova utazik az adat, és mi nem hagyja el a környezetemet?

A nyelvi modellek **nem nálam futnak**, hanem az OpenAI és az Anthropic **USA-beli API-jain**. Oda a **kérdés
szövege** jut ki, valamint a kérdésből generált **HyDE-bekezdés** és a keresés által kiválasztott ETSI
szövegrészletek — utóbbiak nyilvános szabványszövegek. **Nálam marad** a teljes tudásbázis, az 1 657 chunk
vektora a saját pgvector adatbázisomban, a keresés maga (az teljes egészében nálam fut), az interakciós napló
(`logs/interactions.jsonl`) és az eszkalációs ticketek (`support/handoffs.jsonl`). A modellek soha nem látják a
tudásbázist mint egészet, csak a már kiválasztott néhány chunkot. A kiküldött kérdések megőrzését a
szolgáltatónál **enterprise / Zero-Data-Retention szerződéssel** tudom kizárni — ez **ma nincs megkötve**,
beszerzési és jogi feladat. A lépésenkénti részletes bontást az `docs/adatterkep.md`-ben adom.

## 3. Melyik lépésnél hagy jóvá ember, mit lát, és mit tud visszavonni?

Az emberi kapu a **bizonytalanság-eszkaláció**, és ez nem opcionális lépés, hanem a folyamat része: a
`needsHuman` szabály eszkalál, ha a rendszerem nem talált támaszt a kérdésre (`out_of_scope`), vagy ha talált
ugyan, de gyengét — **`topScore < 6`** a 0–10-es skálán (`low_confidence`). Ilyenkor az ügyfél nem kap tartalmi
választ, csak azt, hogy továbbítottam egy szakemberhez, és egy hivatkozási számot. **A szakember látja** a
kérdést, az eszkaláció okát, a magabiztossági pontszámot és az időbélyeget a handoff-rekordban
(`support/handoffs.jsonl`) — és **ő maga válaszol**, a rendszerem nem fogalmaz helyette. Visszavonásra nincs
szükség, mert **a rendszerem semmilyen visszafordíthatatlan műveletet nem hajt végre az ügyfélen**: nem módosít
szerződést, nem indít folyamatot, nem küld ki dokumentumot — kizárólag szöveges tájékoztatást ad. A
visszavonható dolog maga a válasz, azt pedig az ügyintéző felül tudja írni.

## 4. Mi kerül naplóba, ki fér hozzá, meddig marad?

Interakciónként **egyetlen JSON sort** írok a `logs/interactions.jsonl`-ba: időbélyeg, a kérdés szövege, hogy
válaszolt-e vagy eszkalált (`mode`, eszkalációnál az okkal), a magabiztossági pontszám, a válaszidő
ezredmásodpercben és a felhasznált források száma. **A válasz szövegét nem naplózom** — csak azt, hogy hány
forrásra támaszkodott. Az eszkalációk külön fájlba, a `support/handoffs.jsonl`-ba kerülnek, a hivatkozási
számmal együtt. Hozzáférés: a folyamatgazda és az üzemeltetés — a fájlok a saját szerveremen vannak, külső fél
nem fér hozzájuk. Megőrzés: **90 nap** (ökölszám) — ezt viszont ki kell mondanom: **automatikus törlés ma nincs
implementálva**, a naplófájl korlátlanul nő. A 90 napos megőrzéshez egy forgatási/törlési lépést be kell
építenem, mielőtt élesbe megy.

## 5. Mi történik, ha az agent téved, és mennyi idő alatt áll vissza?

Három védelmi réteget tettem egymás mögé. Az első a **grounding**: a rendszerem csak a tudásbázis chunkjaiból
válaszolhat, és minden állítás mellé oda kell tennie a konkrét ETSI klauzulát — a mért átlag **4,87
forrás-hivatkozás válaszonként** —, így a tévedés **ellenőrizhető**, nem rejtett. A második az **eszkaláció**,
ami a gyenge alátámasztottságú eseteket kiszűri, mielőtt válasz lenne belőlük. A harmadik a **heti szakértői
mintaellenőrzés**, ami a megválaszolt interakciókból mintát vesz — ez **új folyamat, ma még nem működik**, a
pilottal együtt indítom el (`docs/meresi-terv.md`, 4. sor). Ha mégis rossz válasz megy ki: a **rollback a
`/support` bejárat kikapcsolása, ami percek alatt megvan**. Az ügyfél a mai csatornára esik vissza,
**adatvesztés nincs** (a napló és a tudásbázis a helyén marad), és a kollégák belső eszköze érintetlen, mert az
külön útvonalon fut. A konkrét hibás válasz javítása ennél lassabb: a naplóból azonosítom a kérdést, de a javítás
a tudásbázis vagy a küszöb módosítását jelenti, nem egy gomb megnyomását.

## 6. Ki lesz a gazda a bevezetés után, és miből látja, hogy jól működik?

A gazda az **ügyfélszolgálati folyamatgazda** — nem a fejlesztés, mert a rendszer az ügyfélszolgálati folyamat
része, nem önálló termék. Amiből dolgozik: a **`npm run report` heti összesítője**, ami a naplóból számol, és a
**`docs/meresi-terv.md`** metrikái. Konkrétan: a **válaszidő** (átlag és p90 — jelenleg mért 8 801 / 12 754 ms),
a **deflektált arány** (válaszolt / összes interakció), az **eszkalációs arány** okonkénti bontásban, és havonta
a **téves-válasz mintaellenőrzés** eredménye. Az első három ma is mérhető, mert a naplózás él; a negyedik az az
új folyamat, amit a pilottal állítok fel. A szponzor havi diát kap, a compliance a mintaellenőrzés eredményét.

---

# A két kényes kérdésem

## A) A kérdés szövege kimegy egy USA-beli szolgáltatóhoz. Mi garantálja, hogy az ügyfél nem ír bele személyes vagy bizalmas adatot, és mi történik, ha mégis?

**Semmi nem garantálja. Teljes garancia nincs — ezt nem szépítem.** A `/support` oldal tetején ott a jelölés,
hogy géppel beszél, és ott a kérés, hogy ne adjon meg személyes vagy bizalmas adatot — de ez **figyelmeztetés,
nem akadály**. Ha az ügyfél mégis beírja az ügyfélszámát vagy a szerződése részleteit, az **kimegy** az USA-beli
API-hoz, és **bekerül a naplómba is**, mert a kérdés szövegét eltárolom. Ez a maradék kockázat ma valós, és nem
tagadom. Két dolog csökkenti, és a kettő egymást kiegészíti, nem helyettesíti: egy **PII-szűrő** a modellhívás
előtt technikai úton kiszedné a felismerhető azonosítókat, a **Zero-Data-Retention szerződés** pedig szerződéses
úton zárná ki, hogy a kiküldött szöveg megmaradjon vagy tanításba kerüljön a szolgáltatónál. **Egyik sincs ma
megvalósítva** — mindkettő külön döntést és külön ráfordítást igényel, és a pilot előtt legalább az egyikről
dönteni akarok. Amit ma kimondhatok: a rendszerem nem *kér* személyes adatot, nem is *igényli* a működéséhez, és
a naplóhoz a hozzáférés nálam marad.

## B) A grounding csökkenti, de nem szünteti meg a hibát. Mi történik, ha az asszisztensem magabiztosan rossz szabvány-értelmezést ad egy ügyfélnek, aki arra támaszkodik — és ki felel?

**Ez megtörténhet, és előbb-utóbb meg is fog.** A grounding a hibát ritkítja, nem szünteti meg: a rendszerem a
helyes szabványrészletet is félreértelmezheti, vagy a keresés hozhat rossz klauzulát. Három dolgot állítok
ellene. Először: **minden válasz mellett kötelező a forrás-hivatkozás**, kattintható ETSI-linkkel — az ügyfél és
a kollégám **ellenőrizni tudja a szabványhelyen**, hogy a válasz valóban azt mondja-e. Ez a rendszerem
legfontosabb tulajdonsága, és ezért éri meg a ~9–13 másodperces válaszidő. Másodszor: a **bizonytalan eseteket
eszkalálom** — ha a támasz gyenge, nem születik válasz. Harmadszor, és ez a lényeg: **jogilag és szakmailag a
végső felelősség a szolgáltatóé, azaz emberé — az asszisztensem tájékoztat, nem dönt és nem ad kötelező érvényű
szakvéleményt.** Ezt az ügyfél felé is egyértelművé teszem, nem elrejtve az apró betűben. Ebből következik egy
korlát, amit vállalok: **a magas tétű kérdéseket emberhez kell irányítanom** — ahol az ügyfél döntése pénzbe,
jogi következménybe vagy megfelelőségi kockázatba kerül, ott a gyorsaság nem ér annyit, mint a felelős emberi
válasz. A rendszerem ma ezt a szűrést **magabiztosság alapján** végzi (`topScore < 6`), nem a kérdés tétje
alapján; ha a pilot azt mutatja, hogy ez nem elég, a tét szerinti irányítást külön be kell építenem.
