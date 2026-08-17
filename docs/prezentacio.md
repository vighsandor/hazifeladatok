# Ügyfélszolgálati e-aláírás asszisztens

### Döntés-előkészítő — vezetői kör, 5 perc

**24/7 forrásmegjelölt választ adok az ügyfelek elektronikus aláírással kapcsolatos kérdéseire —
bizonytalanság esetén emberhez irányítva.**

Működő PoC. Ma nem technológiai kérdésről döntünk, hanem egy 4 hetes pilotról.

---

## As-is → to-be

| | **Ma** | **Az asszisztensemmel** |
|---|---|---|
| Átfutás egy kérdésre | 10 perc ügyintézői munka (ökölszám), munkaidőben | **8,8 s átlag / 12,8 s p90** (mért), 24/7 |
| Ismétlődő kérdések | 30 support-óra/hó (ökölszám) | ~0 óra a deflektált részre |
| Konzisztencia | ügyintézőnként eltérő, forrás nélkül | **4,87 ETSI hivatkozás/válasz** (mért) |

**Amit megoldok:** #1 munkaidőn kívüli válasz · #2 ismétlődő kérdések · #9 konzisztencia ·
#3 új ügyfél eligazodása — részben

**Amit NEM oldok meg:** #4 ügystátusz-lekérdezés · #7 szerződés és papírmunka · #10 lemorzsolódás
Ezekhez nem nyúlok, és nem is ígérem, hogy hozzányúlok. A teljes bontást az `docs/fajdalom-osszegzo.md`-ben adom.

---

## A PoC — mit csinál

Az ügyfél feltesz egy kérdést a `/support` oldalon. A rendszerem a saját, 20 ETSI szabványból épített
tudásbázisában keres, és **csak abból** válaszol — minden állítás mellé odateszi a konkrét klauzulát.
Ha nem talál elég erős alapot, **nem találgat**: emberhez irányít.

**Demó 1 — megválaszolt kérdés** (mért futás)
„What are the PAdES baseline signature levels?" → B-B / B-T / B-LT / B-LTA, **5 forrással**,
kattintható ETSI-hivatkozásokkal. 12,8 s.

**Demó 2 — eszkaláció** (mért futás)
„How do I reset my billing portal password?" → nincs válasz, hanem:
*„Ebben nem vagyok biztos, ezért továbbítottam egy szakemberünknek, aki jelentkezni fog. (Hivatkozás: HO-…)"*
4,3 s.

**A válaszidő ~9–13 s** — lassabb egy szokásos chatnél. **Ez a forrásmegjelölt, ellenőrizhető válasz ára:**
a rendszerem megkeresi és megjelöli a szabványhelyet, ahol az ügyfél vagy a kollégám ellenőrizni tudja.
Forrás nélkül gyorsabb lenne — de pont azt nem tudná, amiért csinálom.

---

## Adattérkép — hova kerül az ügyfél kérdése

| Lépés | Hol történik |
|---|---|
| a kérdés begépelése a `/support`-on | **nálam** |
| keresés a tudásbázisban (ETSI szabványok + vektorok) | **nálam** |
| nyelvi feldolgozás és válaszgenerálás | **külső API — USA** |
| eszkalációs rekord, interakciós napló | **nálam** |

**A fő adat-kilépési pont, kimondva: a kérdés szövege az USA-beli szolgáltatókhoz jut.**
A tudásbázis nyilvános ETSI szabvány, az ügyfél személyes azonosítóit nem küldöm ki.

**Mérséklés:** AI-jelölés az oldal tetején ✅ · „ne adj meg személyes adatot" figyelmeztetés ✅ ·
PII-szűrő ⬜ döntést igényel · Zero-Data-Retention szerződés ⬜ beszerzési feladat

A részletes térképet az `docs/adatterkep.md`-ben adom.

---

## A szám

> **600 kérdés/hó × 30% ismétlődő × 10 perc = 30 support-óra/hó ≈ 270 000 Ft/hó**
> (alsó becslés — négy ökölszámon áll)

| | Összeg |
|---|---|
| Megtakarítás | **~270 000 Ft/hó** (alsó becslés) |
| Folyó költség | **~23 000 Ft/hó** (LLM ~3 000 + üzemeltetés ~20 000) (felső becslés) |
| Egyszeri | 600 000 Ft (felső becslés) — ennek kisebbik fele a fejlesztés |
| **Megtérülés** | **~2,4 hónap** |

**A négy ökölszám:** 600 kérdés/hó · 30% ismétlődő · 10 perc/kérdés · 9 000 Ft/óra — **felülírhatók**.
**Érzékenység:** ha a kérdésszám vagy az ismétlődő arány feleződik, a megtakarítás is feleződik,
a költségoldal viszont alig változik. A döntés ezen a négy számon áll, nem a technológián.

---

## Rollout

| Hét | Mi történik |
|---|---|
| **1–4.** | **Pilot 20 ügyféllel** (ökölszám) — élesben, mért forgalommal |
| **4.** | **Go/no-go** a pilot **mért adatai** alapján (`npm run report`): deflektált arány, válaszidő, eszkalációs arány |
| **5-től** | teljes bevezetés — vagy leállítás, ha a számok nem jönnek ki |

**Go/no-go dátum:** 2026. október 2.
**A rendszer gazdája a go-live után:** ügyfélszolgálati folyamatgazda, heti riporttal.

A döntést nem most kérem véglegesen — a 4. héten, valós számok alapján hozzuk meg.

---

## Mérési terv

**Fájdalom-metrika — javult-e az ügyfélszolgálat helyzete?**
Deflektált arány (válaszolt / összes) és válaszidő (átlag + p90). Forrás: az interakciós napló.
**Hetente**, a folyamatgazdának. *Ma is mérhető, a naplózás él.*

**Hiba-metrika — hol téved vagy hol nem elég az asszisztensem?**
Eszkalációs arány (az agent **korlátja**) + téves válaszok aránya szakértői mintaellenőrzésből
(az agent **hibája**). **Havonta**, szponzornak és compliance-nek.
*A mintaellenőrzés új folyamat — a pilottal együtt indítom el.*

A kettő nem ugyanaz: a magas eszkaláció önmagában nem rossz hír — azt jelenti, hogy a rendszerem
felismerte a korlátját. A téves válasz mindig rossz hír.

A részletes tervet az `docs/meresi-terv.md`-ben adom.

---

## Mit kérek

**A döntés:** indulhat-e a 4 hetes pilot 20 ügyféllel?
**A keret:** 400 000 Ft-ig (felső becslés)
**A dátum:** go/no-go 2026. október 2., mért adatok alapján

**Kockázat és visszavehetőség**

- **Emberi kapu** — bizonytalanságnál a rendszerem eszkalál, nem találgat (beépítve, demózva).
- **AI-jelölés és adatvédelmi figyelmeztetés** az oldalon (kész).
- **Minden interakciót naplózok** — a döntés utólag is auditálható.
- **Rollback:** a `/support` bejáratot **percek alatt kikapcsolom**. Az ügyfél a mai csatornára esik
  vissza, adatvesztés nincs, a kollégák belső eszköze érintetlen marad.
- **A fő kockázat** — a kérdés szövege külföldre kerül — a 4. dia szerinti mérséklésekkel kezelt;
  a PII-szűrőről és a ZDR-szerződésről külön döntést kérek.
