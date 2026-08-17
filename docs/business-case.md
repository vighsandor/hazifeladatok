# Business case — ügyfélszolgálati e-aláírás asszisztens

## 1. Egy mondat

**24/7 forrásmegjelölt választ adok az ügyfelek elektronikus aláírással kapcsolatos kérdéseire — és amikor a
rendszerem bizonytalan, emberhez irányítok.**

## 2. As-is → to-be

| Szempont | **As-is** (ma) | **To-be** (az asszisztensemmel) |
|---|---|---|
| **Átfutás egy kérdésre** | 10 perc ügyintézői munka (ökölszám), csak munkaidőben | **8,8 s átlag / 12,8 s p90** (mért), 24/7 |
| **Ismétlődő kérdések terhe** | 30 support-óra/hó (ökölszám, lásd a 3. pont levezetését) | ~0 óra a deflektált részre; marad a mintaellenőrzés |
| **Konzisztencia** | ügyintézőnként eltérő megfogalmazás, forrásmegjelölés nélkül | válaszonként **4,87 ETSI klauzula-hivatkozás** (mért), ellenőrizhetően |

## 3. A szám (ROI)

A levezetést négy ökölszámra építem, és ezeket a megrendelő nyugodtan felülírhatja — a számítás együtt mozog
velük: havi ügyfélkérdés a supporthoz **600** (ökölszám), ebből az asszisztensem által megválaszolható ismétlődő
kérdés **30%** (ökölszám), egy kérdés kézi megválaszolása **10 perc** (ökölszám), terhelt support-óradíj
**9 000 Ft** (ökölszám), árfolyam **380 Ft/$** (ökölszám).

> **600 × 30% × 10 perc = 1 800 perc = 30 support-óra/hó ≈ 30 × 9 000 = 270 000 Ft/hó megtakarítás** (alsó becslés)

Ezt szándékosan **alsó** becslésnek veszem: csak a 30%-os ismétlődő szeletet számolom, és nem teszem bele az
ügyfél oldalán megspórolt várakozást, a munkaidőn kívüli kiszolgálás értékét, sem a maradék 70%-on nyert
előszűrést.

> **LLM-költség: 600 kérdés × $0,013 ≈ $7,8/hó ≈ 3 000 Ft/hó** — a $0,013/kérdés **mért** egységár (a HF3-ból).

A megtakarítás és az LLM-költség között nagyságrendi, kétszázszoros a különbség: a modellhívás ára ebben a
kalkulációban gyakorlatilag nem tényező.

## 4. Költség és idő (felső becslés)

| Tétel | Összeg | Jelleg |
|---|---|---|
| **Fejlesztés** — a rendszerem jórészt kész (integráció + eszkaláció + napló megvan), maradék finomítás | 200 000 Ft (ökölszám, felső) | egyszeri |
| **Bevezetés / change management** — betanítás, folyamatba illesztés, a mintaellenőrzés beindítása | 400 000 Ft (ökölszám, felső) | egyszeri |
| **LLM API** | ~3 000 Ft/hó (mért egységárból) | folyó |
| **Üzemeltetés** — a meglévő szerver és Postgres kiegészítése, felügyelet | 20 000 Ft/hó (ökölszám, felső) | folyó |

**Kimondom: a fejlesztés a költség kisebbik fele.** A 600 000 Ft egyszeri ráfordításból a fejlesztés 200 000 Ft
— a nagyobbik tétel a bevezetés és a change management, mert a technológia már működik, az emberi folyamatot
kell köré építenem.

Az első évet a felső költséggel és az alsó haszonnal számolva: **600 000 + 12 × 23 000 = 876 000 Ft** kiadás
szemben **12 × 270 000 = 3 240 000 Ft** megtakarítással. **A megtérülés ≈ 2,4 hónap** (becsült).

## 5. Kockázat és visszavehetőség

Amit beépítettem:
- **Emberi kapu** — bizonytalanságnál a rendszerem nem találgat, hanem eszkalál. A mért eszkalációs arány
  **37,5%** (mért, de szintetikus mintán — a 20 tesztkérdésből 5 szándékosan hatókörön kívüli volt, tehát ez
  az érték felülről torzított; éles forgalomra újra kell mérnem).
- **AI-jelölés** a `/support` oldal tetején, jól láthatóan.
- **„Kérjük, ne adj meg személyes vagy bizalmas adatot"** ugyanabban a sávban.
- **Naplózás** minden interakcióra: időbélyeg, kérdés, mód, magabiztosság, válaszidő, forrás-szám.

**Visszavehetőség:** a `/support` bejáratot **percek alatt ki tudom kapcsolni**. Az ügyfél a jelenlegi
csatornára esik vissza, adatvesztés nincs (a napló és a tudásbázis a helyén marad), és a **belső eszköz
érintetlen** — a kollégák felülete külön útvonalon fut, azt a visszakapcsolás nem érinti.

**A fő kockázat:** a kérdés szövege az USA-beli OpenAI és Anthropic API-khoz jut. Mérséklés: AI-jelölés,
figyelmeztetés a személyes adatokra, opcionális PII-szűrő, valamint enterprise / Zero-Data-Retention szerződés.
Részletesen az `docs/adatterkep.md`-ben írom le.

## 6. Mit kérek

- **4 hetes pilotot** egy **20 fős** (ökölszám) ügyfélkörrel.
- **Keret:** 400 000 Ft-ig (ökölszám, felső becslés).
- **Go/no-go döntés:** 2026. október 2., a pilot mért adatai alapján (`npm run report`).
- **A rendszer gazdája a go-live után:** az ügyfélszolgálati folyamatgazda, az `docs/meresi-terv.md` szerinti
  heti riporttal.

---

## Címkézés — mi mennyire biztos

| Címke | Mit jelent | Mely számok |
|---|---|---|
| **Mért** | Ténylegesen megmért, reprodukálható érték | $0,013/kérdés (HF3); 8 801 ms átlag; 12 754 ms p90; 4,87 forrás/válasz; 37,5% eszkaláció (`docs/meresi-adatok.txt`, 24 interakció) |
| **Becsült** | Mért és ökölszám adatokból levezetett | 270 000 Ft/hó megtakarítás; ~3 000 Ft/hó LLM-költség; 876 000 Ft első éves kiadás; 2,4 hónapos megtérülés |
| **Ökölszám** | Feltevés, amit a megrendelő felülírhat — a levezetés együtt mozog vele | 600 kérdés/hó; 30% ismétlődő; 10 perc/kérdés; 9 000 Ft/óra; 380 Ft/$; 200 000 Ft fejlesztés; 400 000 Ft bevezetés; 20 000 Ft/hó üzemeltetés; 20 fős pilot; 400 000 Ft keret |

Két korlátot a döntés előtt is kimondok: a mért értékeim **24 interakcióból** származnak (indulási referencia,
nem statisztika), és a **teljes ROI a négy ökölszámon áll** — ha a havi kérdésszám vagy az ismétlődő arány
felére csökken, a megtakarítás is felére csökken, miközben a költségoldal alig változik.
