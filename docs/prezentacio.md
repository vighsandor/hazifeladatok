# Ügyfélszolgálati e-aláírás asszisztens

### Döntés-előkészítő — vezetői kör, 5 perc

**24/7 forrásmegjelölt válasz az ügyfelek elektronikus aláírással kapcsolatos kérdéseire —
bizonytalanság esetén emberhez irányítva.**

Működő PoC. Ma nem technológiai kérdésről döntünk, hanem egy 4 hetes pilotról.

---

## As-is → to-be

| | **Ma** | **Asszisztenssel** |
|---|---|---|
| Átfutás egy kérdésre | 10 perc ügyintézői munka *[ökölszám]*, munkaidőben | **8,8 s átlag / 12,8 s p90** *(mért)*, 24/7 |
| Ismétlődő kérdések | 30 support-óra/hó *[ökölszám]* | ~0 óra a deflektált részre |
| Konzisztencia | Ügyintézőnként eltérő, forrás nélkül | **4,87 ETSI hivatkozás/válasz** *(mért)* |

**Amit megold:** #1 munkaidőn kívüli válasz · #2 ismétlődő kérdések · #9 konzisztencia ·
#3 új ügyfél eligazodása — részben

**Amit NEM old meg:** #4 ügystátusz-lekérdezés · #7 szerződés és papírmunka · #10 lemorzsolódás
Ezekhez nem nyúl, és nem is ígérjük, hogy hozzányúl. A teljes bontás: `docs/fajdalom-osszegzo.md`

---

## A PoC — mit csinál

Az ügyfél feltesz egy kérdést a `/support` oldalon. A rendszer a saját, 20 ETSI szabványból épített
tudásbázisában keres, és **csak abból** válaszol — minden állítás mellé odateszi a konkrét klauzulát.
Ha nem talál elég erős alapot, **nem találgat**: emberhez irányít.

**Demó 1 — megválaszolt kérdés** *(mért futás)*
„What are the PAdES baseline signature levels?" → B-B / B-T / B-LT / B-LTA, **5 forrással**,
kattintható ETSI-hivatkozásokkal. 12,8 s.

**Demó 2 — eszkaláció** *(mért futás)*
„How do I reset my billing portal password?" → nincs válasz, hanem:
*„Ebben nem vagyok biztos, ezért továbbítottam egy szakemberünknek, aki jelentkezni fog.
(Hivatkozás: HO-…)"* 4,3 s.

**A válaszidő ~9–13 s** — lassabb egy szokásos chatnél. **Ez a forrásmegjelölt, ellenőrizhető válasz ára:**
a rendszer megkeresi és megjelöli a szabványhelyet, ahol az ügyfél vagy a kollégánk ellenőrizni tudja.
Forrás nélkül gyorsabb lenne — de pont azt nem tudná, amiért csináljuk.

---

## Adattérkép — hova kerül az ügyfél kérdése

| Lépés | Hol történik |
|---|---|
| A kérdés begépelése a `/support`-on | **Nálunk** |
| Keresés a tudásbázisban (ETSI szabványok + vektorok) | **Nálunk** |
| Nyelvi feldolgozás és válaszgenerálás | **Külső API — USA** |
| Eszkalációs rekord, interakciós napló | **Nálunk** |

**A fő adat-kilépési pont, kimondva: a kérdés szövege az USA-beli szolgáltatókhoz jut.**
A tudásbázis nyilvános ETSI szabvány, az ügyfél személyes azonosítóit nem küldjük ki.

**Mérséklés:** AI-jelölés az oldal tetején ✅ · „ne adj meg személyes adatot" figyelmeztetés ✅ ·
PII-szűrő ⬜ döntést igényel · Zero-Data-Retention szerződés ⬜ beszerzési feladat

Részletes térkép: `docs/adatterkep.md`

---

## A szám

> **600 kérdés/hó × 30 % ismétlődő × 10 perc = 30 support-óra/hó ≈ 270 000 Ft/hó**
> *(alsó becslés — négy ökölszámon áll)*

| | Összeg |
|---|---|
| Megtakarítás | **~270 000 Ft/hó** *(alsó becslés)* |
| Folyó költség | **~23 000 Ft/hó** (LLM ~3 000 + üzemeltetés ~20 000) *[felső becslés]* |
| Egyszeri | 600 000 Ft *[felső becslés]* — ennek kisebbik fele a fejlesztés |
| **Megtérülés** | **~2,4 hónap** |

**A négy ökölszám:** 600 kérdés/hó · 30 % ismétlődő · 10 perc/kérdés · 9 000 Ft/óra — **felülírhatók**.
**Érzékenység:** ha a kérdésszám vagy az ismétlődő arány feleződik, a megtakarítás is feleződik,
a költségoldal viszont alig változik. A döntés ezen a négy számon áll, nem a technológián.

---

## Rollout

| Hét | Mi történik |
|---|---|
| **1–4.** | **Pilot 20 ügyféllel** *[ökölszám]* — élesben, mért forgalommal |
| **4.** | **Go/no-go** a pilot **mért adatai** alapján (`npm run report`): deflektált arány, válaszidő, eszkalációs arány |
| **5-től** | Teljes bevezetés — vagy leállítás, ha a számok nem jönnek ki |

**Go/no-go dátum:** 2026. október 2.
**A rendszer gazdája a go-live után:** ügyfélszolgálati folyamatgazda, heti riporttal.

A döntést nem most kérjük véglegesen — a 4. héten valós számok alapján hozzuk meg.

---

## Mérési terv

**Fájdalom-metrika — javult-e az ügyfélszolgálat helyzete?**
Deflektált arány (válaszolt / összes) és válaszidő (átlag + p90). Forrás: az interakciós napló.
**Heti**, a folyamatgazdának. *Ma is mérhető, a naplózás él.*

**Hiba-metrika — hol téved vagy hol nem elég az asszisztens?**
Eszkalációs arány (az agent **korlátja**) + téves válaszok aránya szakértői mintaellenőrzésből
(az agent **hibája**). **Havi**, szponzornak és compliance-nek.
*A mintaellenőrzés új folyamat — a pilottal együtt kell elindítani.*

A kettő nem ugyanaz: a magas eszkaláció önmagában nem rossz hír — azt jelenti, hogy a rendszer
felismerte a korlátját. A téves válasz mindig rossz hír.

Részletes terv: `docs/meresi-terv.md`

---

## Mit kérünk

**A döntés:** indulhat-e a 4 hetes pilot 20 ügyféllel?
**A keret:** 400 000 Ft-ig *[felső becslés]*
**A dátum:** go/no-go 2026. október 2., mért adatok alapján

**Kockázat és visszavehetőség**

- **Emberi kapu** — bizonytalanságnál a rendszer eszkalál, nem találgat *(beépítve, demózva)*
- **AI-jelölés és adatvédelmi figyelmeztetés** az oldalon *(kész)*
- **Minden interakció naplózva** — a döntés utólag is auditálható
- **Rollback:** a `/support` bejárat **percek alatt kikapcsolható**. Az ügyfél a mai csatornára esik
  vissza, adatvesztés nincs, a kollégák belső eszköze érintetlen marad.
- **A fő kockázat** — a kérdés szövege külföldre kerül — a 4. dia szerinti mérséklésekkel kezelt,
  a PII-szűrőről és a ZDR-szerződésről külön döntést kérünk.
