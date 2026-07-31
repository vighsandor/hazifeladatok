# HF2 — Harness-összehasonlítás: Superpowers vs. BMAD

**Feladat:** kis REST szolgáltatás Postgres fölött, idempotens seed + offline geokódolás,
2 GET végpont, haversine unit teszt.
**Ágak:** `harness/superpowers-claude` és `harness/bmad-claude`.
**Repo:** https://github.com/vighsandor/hazifeladatok
**Modell:** mindkét ágon ugyanaz a Haiku modell (a tiszta összehasonlításért).

---

## Összefoglaló táblázat

| Szempont | Superpowers | BMAD |
|---|---|---|
| Setup ideje / nehézsége | ~2 óra (Windows env) + ~25 perc MCP; a plugin telepítése maga gyors | Az alap már megvolt; itt aktiválás + `npx bmad-method install` + reload + MCP (~40 perc). Induláskor más branch-ekbe is belenyúlt |
| Tervezési fázis | Erős: brainstorm → `DESIGN.md` (10 szekció) → részletes terv (32 feladat), commitolva | Erős: stakes-kérdés + 18 feltételezés jóváhagyásra → PRD + Epics & Stories; a scope végig egyszerű maradt |
| Iteráció / manuális terelés | Nagyon sok: 2+ óra kérdez-felelek, sok apró döntés | Sok („szájbarágós"), de kicsit kevesebb, mint a Superpowersnél; a tervezés jóváhagyás-alapú |
| Elsőre működött-e a kód | Nem: `tsx`/`psql`/UNC gond, de csak a KÖRNYEZETET kellett javítani, a kódot nem | Nem: több valós KÓDHIBA a tesztelésnél (`.env` betöltés, egyediségi kulcs, null-teszt reset); javítások után OK |
| Írt-e magától tesztet | Igen: parser/codegen/executor + haversine geo-teszt | Jest tesztfájlok + kézi test-runner (10/10). A Jest az UNC úton nem futott |
| Edge case-ek (ismeretlen település, null-koord.) | Kezelve: null a végén; ékezet/kis-nagybetű-független; idempotens `ON CONFLICT` | Kezelve: null a végén; ékezet/kis-nagybetű-független; idempotens `ON CONFLICT` (egyediségi kulcs élő táblán `ALTER`-rel pótolva) |
| Commitok granularitása | 13 fókuszált commit + `v1.0.0` tag | ~16 story-alapú commit — jó; DE az utolsó módosítást nem commitolta |
| Mennyire kellett átvenni az irányítást | Többször: env-javítások + a **push kézzel** | Többször: env/DB-hibák javítása, Jest→kézi runner, és a **push + az utolsó commit kézzel** |
| Idő a working kódig / token | ~2 óra; elfogyott a token-keret | ~fele annyi idő; a token-keret nem fogyott el |

---

## 1. Setup és tanulási görbe
- **Superpowers:** A beállítás volt a legnehezebb rész. A VS Code + Claude Code + Git + Node.js
  együttes (a Node telepítője a Chocolatey-t és a Pythont is behúzta), majd a plugin bekötése ~2 órát,
  az MCP csatlakoztatása további ~25 percet vett igénybe. A súrlódás nagyrészt a Windows + hálózati
  meghajtó környezetből eredt, nem a pluginból. Maga a munkafolyamat átlátható (brainstorm→terv→végrehajtás).
- **BMAD:** Az alaprendszer már megvolt, így csak a Claude Code aktiválása, a `npx bmad-method install`,
  egy reload és az MCP újracsatlakoztatása kellett (~40 perc). **Rossz első benyomás:** az induláskor a
  BMAD **más branch-ekbe is belenyúlt**, nem csak a munkaágba — kézzel kellett a `harness/bmad-claude`-ra
  korlátozni. Ráadásul a parancsok a dokumentációtól eltérően **namespace-eltek** (`/bmad-agent-pm` a
  `/pm` helyett), és **nincs külön Scrum Master/QA agent** (a story-zás a PM-nél, a tesztelés a Dev-nél).

## 2. Steering (terelés, javítás)
- **Superpowers:** Nagyon interaktív, helyenként „szájbarágós": több mint két óra tisztázó kérdés kellett,
  mire kód született, és szinte minden fájl-/parancs-művelet külön jóváhagyást kért. A meghozott
  döntésekhez viszont következetesen tartotta magát.
- **BMAD:** Szintén erősen irányított, de egy hajszálnyival kevésbé, és **gyorsabb**. A szerep-átadások
  (PM → Dev) rendben működtek; a PM **interjúztat** és jóváhagyás-alapú (18 feltételezés a kód előtt).
  A fő steering-súrlódás az induló branch-átlépés megállítása és a namespace-elt parancsok kihámozása volt.

## 3. Tervezési fázis
- **Superpowers:** Kiemelkedő, de „nehéz": teljes `DESIGN.md` (10 szekció) + részletes implementációs terv
  (32 feladat) a kód előtt, commitolva, és a végrehajtás szorosan követte. Jellemző mellékhatás: a scope a
  minimalista REST helyett egy **meta kód-generátorrá** nőtt (részben az én terelésemre) — funkcionálisan
  megfelel, de a szükségesnél összetettebb.
- **BMAD:** Szintén erős, de **arányosabb**. Előbb rákérdezett a **„stakes"-re** (belső/learning vs.
  production) és ez alapján skálázta a mélységet — ez a „scale-adaptive" viselkedés a Superpowersnél nem
  volt. 18 explicit **feltételezést** listázott jóváhagyásra a kód előtt, és a scope végig **egyszerű,
  közvetlen REST szolgáltatás** maradt. Elkészült a `prd.md` és az `epics-and-stories.md`.

## 4. Kód minősége
- **Superpowers:** A tesztek a csomag részei lettek, az edge-case-ek végig lettek gondolva (null a végén,
  ékezet- és kis/nagybetű-független egyeztetés, idempotens seed). A csomag **nem futott elsőre** ezen a
  környezeten (`tsx`/`psql` hiány, UNC-útvonal), de **csak a környezetet kellett javítani** (meghajtó-képezés,
  Node-alapú migráció) — **a kódhoz nem kellett hozzányúlni**. Utána: `count = 15`, helyes távolságok
  (Budapest 0, Vienna 214,0, …), idempotens seed.
- **BMAD:** A logika alapvetően jó (haversine, geokódolás), de a tesztelés **több valós kódhibát** hozott
  elő: a `.env` nem töltődött be (kézi loader kellett), a `CREATE TABLE IF NOT EXISTS` nem tette rá az
  egyediségi kulcsot egy létező táblára (`ALTER TABLE ... ADD CONSTRAINT` kellett), és a null-teszthez egy
  `RESET_DB` mód kellett. A **Jest az UNC úton nem futott** — helyette **kézi `test-runner.ts`** validált
  (10/10 zöld). Javítások után minden működik: `count = 15`, Vienna 214,0, idempotencia (2. seed: 0/15),
  null a végén (Ljubljana → Matej Horvat `distanceKm: null`).
- **Ellenőrzés (mindkét ágon):** `count = 15`; a `by-distance` sorrend és `distanceKm` a várt szerint
  (Budapest 0 · Vienna 214,0 · … · Lisbon 2469,4); ismeretlen település a végén `null`-lal.

## 5. Kontroll
- **Superpowers:** Többször kézbe kellett venni: a környezetfüggő hibák javítása, és az explicit utasítás
  ellenére **nem pusholt** (kézi push). Pozitívum a granuláris commitok + `v1.0.0` tag.
- **BMAD:** Szintén többször: az induló branch-átlépés megállítása, az env/DB-hibák javítása, a Jest→kézi
  runner váltás, és a lezárás **trehánysága** — **nem pusholt**, és **az utolsó módosítást nem is
  commitolta**, azt is kézzel kellett.

## 6. Összegzés — melyiket választanám hosszú távra, és miért

A két eszköz **markánsan másképp dolgozott ugyanazon a feladaton, ugyanazzal a modellel**, és ez a
különbség tanulságos:

- A **Superpowers** volt a **fegyelmezettebb**: mély, dokumentált terv, és a **generált kód a tesztelésnél
  hibátlanul futott** (csak a környezetet kellett igazítani). Ára: **lassú (~2 óra)**, **elfogyasztotta a
  token-keretet**, és **túltervezett** (meta-generátor a minimalista szolgáltatás helyett).
- A **BMAD** volt a **gyorsabb és takarékosabb**: ~fele idő, a token-keret nem fogyott el, **stakes-tudatos,
  arányos terv**, és **jól tartotta a scope-ot**. Ára: **az induló branch-átlépés** (nagy negatívum), a
  tesztelésnél **több valós kódhiba**, a **nem futó Jest** (kézi runner kellett), és a **trehány lezárás**
  (nincs push, az utolsó commit is kimaradt).

Közös tanulság: **mindkettő jóval „szájbarágósabb"/önállótlanabb**, mint a megszokott autonóm
opencode + Ollama munkafolyamatom, és **egyik sem pusholt** magától.

**Döntés (a saját tapasztalatom alapján):** erre a feladattípusra — **kicsi, jól specifikált** —
hosszú távon a **BMAD**-ot választanám, mert gyorsabb, token-takarékosabb és jobban tartja a scope-ot; a
tervezési fázis (stakes + jóváhagyott feltételezések) jó egyensúlyt ad ceremónia és sebesség közt. Cserébe
tudni kell, hogy **a kimenetét tesztelni és javítani kell**, és a lezárást (commit/push) kézben kell tartani.
Nagyobb, kevésbé definiált feladatra viszont a **Superpowers** mélyebb terve és first-try helyesebb kódja
többet érhet — ha van rá idő és token-keret. *(Ezt a záró preferenciát igazítsd a sajátodhoz, ha másképp súlyozol.)*

### Pro / kontra röviden
- **Superpowers** — pro: erős, átlátható tervezés (design doc + részletes terv); a generált kód a
  tesztelésnél hibátlanul futott; kis, fókuszált commitok + verziózás; jó dokumentáció. · kontra: nagyon sok
  kézi jóváhagyás („szájbarágós"); lassú (~2 óra) és elfogyasztotta a token-keretet; túltervezésre hajlamos
  (meta-generátor); utasítás ellenére nem pusholt.
- **BMAD** — pro: gyors és token-takarékos (~fele idő); stakes-tudatos, arányos terv és jó scope-fegyelem;
  jóváhagyás-alapú feltételezések a kód előtt; teszt-útmutatót is adott (`VALIDATION.md`); kis, story-alapú
  commitok. · kontra: az induláskor más branch-ekbe is belenyúlt; a kódban valós hibák voltak (tesztelésnél
  derültek ki); a Jest nem futott (kézi runner kellett); nem pusholt, és az utolsó módosítást nem commitolta.

---

### Módszertani megjegyzés
A két ág forráskódja azért tér el, mert **ténylegesen a két harness vezette a folyamatot** (külön, friss
sessionben, külön branchen), nem másoltam kódot a két ág közt. A közös bemenet (`seed-customers.json`,
város-koordináták) szándékosan azonos. A tervezési artefaktumok külön mappákban vannak (Superpowers:
`docs/DESIGN.md`, terv; BMAD: `planning-artifacts/` PRD + Epics & Stories).
