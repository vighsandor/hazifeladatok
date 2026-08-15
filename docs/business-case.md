# Business case — ügyfélszolgálati e-aláírás asszisztens

## 1. Egy mondat

**24/7 forrásmegjelölt válasz az ügyfelek elektronikus aláírással kapcsolatos kérdéseire — bizonytalanság
esetén emberhez irányítva.**

## 2. As-is → to-be

| Szempont | **As-is** (ma) | **To-be** (asszisztenssel) |
|---|---|---|
| **Átfutás egy kérdésre** | 10 perc ügyintézői munka *[ökölszám]*, csak munkaidőben | **8,8 s átlag / 12,8 s p90** *(MÉRT)*, 24/7 |
| **Ismétlődő kérdések terhe** | 30 support-óra/hó *[ökölszám-levezetés, lásd 3.]* | ~0 óra a deflektált részre; marad a mintaellenőrzés |
| **Konzisztencia** | Ügyintézőnként eltérő megfogalmazás, forrásmegjelölés nélkül | Válaszonként **4,87 ETSI klauzula-hivatkozás** *(MÉRT)*, ellenőrizhetően |

## 3. A szám (ROI)

**Ökölszám-feltevések — ezek felülírhatók, a levezetés együtt mozog velük:**
havi ügyfélkérdés a supporthoz *[ökölszám: 600]* · ebből az asszisztens által megválaszolható ismétlődő kérdés
*[ökölszám: 30 %]* · egy kérdés kézi megválaszolása *[ökölszám: 10 perc]* · terhelt support-óradíj
*[ökölszám: 9 000 Ft]* · árfolyam *[ökölszám: 380 Ft/$]*.

> **600 × 30 % × 10 perc = 1 800 perc = 30 support-óra/hó ≈ 30 × 9 000 = 270 000 Ft/hó megtakarítás**
> *(alsó becslés)*

Ez **alsó** becslés, mert csak a 30 %-os ismétlődő szeletet számolja, és nem tartalmazza az ügyfél oldalán
megspórolt várakozást, a munkaidőn kívüli kiszolgálás értékét, sem a 70 % maradékon nyert előszűrést.

> **LLM-költség: 600 kérdés × $0,013 ≈ $7,8/hó ≈ 3 000 Ft/hó** — a $0,013/kérdés **MÉRT** egységár (HF3).

A megtakarítás és az LLM-költség nagyságrendje **kétszázszoros különbség**: a modellhívás ára ebben a
kalkulációban gyakorlatilag nem tényező.

## 4. Költség és idő (felső becslés)

| Tétel | Összeg | Jelleg |
|---|---|---|
| **Fejlesztés** — a rendszer jórészt kész (integráció + eszkaláció + napló megvan), maradék finomítás | *[ökölszám, felső: 200 000 Ft]* | egyszeri |
| **Bevezetés / change management** — betanítás, folyamatba illesztés, mintaellenőrzés beindítása | *[ökölszám, felső: 400 000 Ft]* | egyszeri |
| **LLM API** | ~3 000 Ft/hó | folyó |
| **Üzemeltetés** — a meglévő szerver és Postgres kiegészítése, felügyelet | *[ökölszám, felső: 20 000 Ft/hó]* | folyó |

**Kimondva: a fejlesztés a költség kisebbik fele.** A 600 000 Ft egyszeri ráfordításból a fejlesztés 200 000 Ft
— a nagyobbik tétel a bevezetés és a change management, mert a technológia már működik, az emberi folyamatot
kell köré építeni.

Első év, felső költséggel és alsó haszonnal számolva: **600 000 + 12 × 23 000 = 876 000 Ft** kiadás szemben
**12 × 270 000 = 3 240 000 Ft** megtakarítással. **Megtérülés ≈ 2,4 hónap** *(becsült)*.

## 5. Kockázat és visszavehetőség

**Beépített védelem:**
- **Emberi kapu** — bizonytalanságnál nem találgat, hanem eszkalál. A mért eszkalációs arány **37,5 %**
  *(MÉRT, de szintetikus mintán — a 20 tesztkérdésből 5 szándékosan hatókörön kívüli volt, tehát ez az érték
  felülről torzított; éles forgalomra újra kell mérni.)*
- **AI-jelölés** a `/support` oldal tetején, jól láthatóan
- **„Kérjük, ne adj meg személyes vagy bizalmas adatot"** ugyanabban a sávban
- **Naplózás** minden interakcióra: időbélyeg, kérdés, mód, magabiztosság, válaszidő, forrás-szám

**Visszavehetőség:** a `/support` bejárat **percek alatt kikapcsolható**. Az ügyfél a jelenlegi csatornára esik
vissza, adatvesztés nincs (a napló és a tudásbázis a helyén marad), és a **belső eszköz érintetlen** — a
kollégák által használt felület külön útvonalon fut, azt a visszakapcsolás nem érinti.

**A fő kockázat:** a kérdés szövege az USA-beli OpenAI és Anthropic API-khoz jut. Mérséklés: AI-jelölés,
figyelmeztetés a személyes adatokra, opcionális PII-szűrő, valamint enterprise / Zero-Data-Retention
szerződés. Részletesen: **`docs/adatterkep.md`**.

## 6. Mit kérünk

- **4 hetes pilot** *[ökölszám: 20]* ügyfélből álló körrel
- **Keret:** *[ökölszám, felső becslés: 400 000 Ft]*
- **Go/no-go döntés:** *[dátum: 2026. október 2.]*, a pilot mért adatai alapján (`npm run report`)
- **A rendszer gazdája a go-live után:** *[szerep: ügyfélszolgálati folyamatgazda]*, a `docs/meresi-terv.md`
  szerinti heti riporttal

---

## Címkézés — mi mennyire biztos

| Címke | Mit jelent | Mely számok |
|---|---|---|
| **MÉRT** | Ténylegesen megmért érték, reprodukálható | $0,013/kérdés (HF3); 8 801 ms átlag; 12 754 ms p90; 4,87 forrás/válasz; 37,5 % eszkaláció (`docs/meresi-adatok.txt`, 24 interakció) |
| **BECSÜLT** | Mért és ökölszám adatokból levezetett | 270 000 Ft/hó megtakarítás; ~3 000 Ft/hó LLM-költség; 876 000 Ft első éves kiadás; 2,4 hónapos megtérülés |
| **ÖKÖLSZÁM** | Feltevés, amit a megrendelő felülírhat — a levezetés együtt mozog vele | 600 kérdés/hó; 30 % ismétlődő; 10 perc/kérdés; 9 000 Ft/óra; 380 Ft/$; 200 000 Ft fejlesztés; 400 000 Ft bevezetés; 20 000 Ft/hó üzemeltetés; 20 fős pilot; 400 000 Ft keret |

Két korlát, amit érdemes a döntés előtt tudni: a MÉRT értékek **24 interakcióból** származnak (indulási
referencia, nem statisztika), és a **teljes ROI a négy ökölszámon áll** — ha a havi kérdésszám vagy az
ismétlődő arány felére csökken, a megtakarítás is felére csökken, miközben a költségoldal alig változik.
