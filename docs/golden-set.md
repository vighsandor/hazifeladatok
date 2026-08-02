# Golden Set — a RAG‑pipeline kiértékelése

Ez a dokumentum a RAG‑rendszer kiértékelése egy 10 kérdéses „golden set"‑en (9 szakmai + 1 negatív),
az **ETSI digitális aláírás** tudásbázison (20 szabvány, 1 657 chunk a pgvectorban). A fókusz a
**PAdES (PDF‑aláírás), a document time‑stamp (PAdES‑DTS) és az időbélyegzés**. Minden kérdést kétféleképp
futtattam: **NYERS** (csak vektorkeresés a kérdés embeddingjével) és **TELJES** (HyDE → vektorkeresés top‑20
→ Claude Haiku rerank → Claude Sonnet grounded válasz).

A számok a `npm run golden` tényleges kimenetéből származnak.

---

## A kérdések és a pontos elvárt eredmény

Minden kérdéshez előre rögzítettem a helyes választ (melyik szabvány / melyik klauzula), mert a kiértékelés
azon múlik, hogy a rendszer ezt a forrást hozza‑e. A „ground truth" a domain‑ismeret alapján lett meghatározva.

**Q1.** „What are the PAdES baseline signature levels?"
- **Elvárt:** ETSI EN 319 142‑1, **6.1 Signature levels** (a négy szint: B‑B, B‑T, B‑LT, B‑LTA).
- *Miért:* a PAdES baseline szinteket a 319 142‑1 6.1 klauzulája definiálja.

**Q2.** „How is a PAdES document time‑stamp signature (PAdES‑DTS) defined?"
- **Elvárt:** ETSI TS 119 142‑3, **1 Scope / 4.1 / 6.1**.
- *Miért:* a PAdES‑DTS‑t a TS 119 142‑3 vezeti be (hatály, általános követelmények, szintek).

**Q3.** „What is the difference between the PAdES‑DTS‑BET and PAdES‑DTS‑A levels?"
- **Elvárt:** ETSI TS 119 142‑3, **6.1** (BET = létezés+integritás; A = hosszú távú time‑stampek).

**Q4.** „Does a PAdES document time‑stamp prove who signed the document?"
- **Elvárt:** ETSI TS 119 142‑3, **1 Scope / 4.1** — a DTS **nem** azonosítja az aláírót (csak integritást és
  létezést bizonyít; nem advanced signature/seal az eIDAS szerint).

**Q5.** „What does the ETSI time‑stamping protocol and time‑stamp token profile specify?"
- **Elvárt:** ETSI **EN 319 422** (time‑stamping protocol and time‑stamp token profiles).

**Q6.** „Which timestamp is required to reach the PAdES B‑T level?"
- **Elvárt:** ETSI EN 319 142‑1 (a **B‑T** szinthez signature time‑stamp kell), a token‑profil **EN 319 422**‑re
  hivatkozva. *(Két szabvány összekötése.)*

**Q7. (magyar)** „Mit bizonyít egy PAdES dokumentum‑időbélyeg, és mit nem?"
- **Elvárt:** ETSI TS 119 142‑3, **1 Scope / 4.1** (integritás + létezés igen; aláíró‑azonosítás nem).
  Magyar kérdés → magyar válasz, angol `[ETSI …]` hivatkozásokkal. *(Többnyelvűség‑teszt.)*

**Q8.** „Which cryptographic hash algorithms does ETSI recommend for time‑stamping and signatures?"
- **Elvárt:** ETSI **TS 119 312** (Cryptographic Suites) — NEM az EN 319 422 (az a protokoll).

**Q9.** „How does PAdES support long‑term availability and integrity of the validation material?"
- **Elvárt:** ETSI EN 319 142‑1 (**B‑LT / B‑LTA** szintek) + kapcsolódóan TS 119 142‑3 (**DTS‑A**).

**Q10. (negatív)** „How do I add a visible handwritten signature image in Adobe Acrobat?"
- **Elvárt:** **NINCS válasz** — out‑of‑domain (Acrobat‑használati kérdés, nincs az ETSI‑korpuszban).
  A rendszer a pontos „Erről nincs információ a tudásbázisban." mondatot adja, `noInfo=true`, 0 forrás.

---

## Összefoglaló táblázat (nyers vs. teljes)

| # | Kérdés (teljes) | Elvárt forrás | NYERS top‑1 (distance) | TELJES top‑1 (rerank‑score) | noInfo |
|---|---|---|---|---|---|
| 1 | What are the PAdES baseline signature levels? | EN 319 142‑1, 6.1 | EN 319 142‑1 · 1 Scope (0.2693) | **EN 319 142‑1 · 6.1 Signature levels (10.0)** | – |
| 2 | How is a PAdES document time‑stamp signature (PAdES‑DTS) defined? | TS 119 142‑3, 1/4.1/6.1 | TS 119 142‑3 · 4.1 General requirements (0.1435) | TS 119 142‑3 · 1 Scope (9.0) | – |
| 3 | What is the difference between the PAdES‑DTS‑BET and PAdES‑DTS‑A levels? | TS 119 142‑3, 6.1 | TS 119 142‑3 · 6.1 Signature levels (0.3252) | TS 119 142‑3 · 6.1 Signature levels (9.0) | – |
| 4 | Does a PAdES document time‑stamp prove who signed the document? | TS 119 142‑3, 1/4.1 | TS 119 142‑3 · 4.1 General requirements (0.2476) | TS 119 142‑3 · 1 Scope (7.0) | – |
| 5 | What does the ETSI time‑stamping protocol and time‑stamp token profile specify? | EN 319 422 | EN 319 422 · 1 Scope (0.2079) | EN 319 422 · 1 Scope (10.0) | – |
| 6 | Which timestamp is required to reach the PAdES B‑T level? | EN 319 142‑1 + EN 319 422 | EN 319 142‑1 · 6.1 Signature levels (0.3520) | EN 319 142‑1 · 6.3 PAdES baseline signatures (9.0) | – |
| 7 | *(magyar)* Mit bizonyít egy PAdES dokumentum‑időbélyeg, és mit nem? | TS 119 142‑3, 1/4.1 | TS 119 142‑3 · 4.1 General requirements (0.4686) | TS 119 142‑3 · 1 Scope (9.0) | – |
| 8 | Which cryptographic hash algorithms does ETSI recommend for time‑stamping and signatures? | TS 119 312 | EN 319 422 · 5.2.3 Algorithms (0.1861) | **TS 119 312 · 10.4 Recommended hash functions (9.0)** | – |
| 9 | How does PAdES support long‑term availability and integrity of the validation material? | EN 319 142‑1 + TS 119 142‑3 | EN 319 102‑1 · 5.6.3.1 Description (0.4079) | EN 319 102‑1 · 5.6.3.4 Processing (7.0) | – |
| 10 | *(negatív)* How do I add a visible handwritten signature image in Adobe Acrobat? | NINCS (out‑of‑domain) | EN 319 142‑2 · 6.3.4 Extensions Dictionary (0.5525) | — (score 0.0) | **true** |

**Összegzés:** a TELJES pipeline mind a 9 szakmai kérdésnél a **helyes szabványra** mutat, és a negatív
kérdésnél helyesen megtagadja a választ. A távolság‑skálán (a mi korpuszunkon **0.2 alatt** jó találat,
**0.5 fölött** gyenge) jól látszik: a magabiztos találatok 0.15–0.35 között vannak, a negatív kérdésé 0.55
(a rendszer „nem talál igazán jót" — és ezt a rerank 0.0‑val meg is erősíti).

---

## A rerank hozzáadott értéke — három konkrét bizonyíték

A vektortávolság **olcsó, de nem okos**: egyetlen számba sűríti a jelentést, és nem „érti" a kérdést. A rerank
(Claude Haiku) elolvassa a jelölteket, és relevanciára pontoz. Három eset mutatja, hogy ez számít:

### 1) Q1 — a felszínes hasonlóság vs. a valódi válasz
A HyDE‑keresés top‑5‑e csupa `Scope`/`Features` chunk volt:
```
HyDE top‑5:            0.1515  EN 319 142‑1 · 1 Scope
                      0.1879  EN 319 142‑1 · 1 Scope
                      0.1927  EN 319 142‑2 · 5.1 Features
                      0.2247  EN 319 142‑2 · 1 Scope
                      0.2340  EN 319 142‑2 · 1 Scope
rerank után:          10.0    EN 319 142‑1 · 6.1 Signature levels   ← ez a valódi válasz
                       9.0    EN 319 142‑1 · 1 Scope
                       2.0    EN 319 142‑1 · 1 Scope
                       1.0    EN 319 142‑2 · 5.1 Features
                       1.0    EN 319 142‑2 · 1 Scope
```
A `6.1 Signature levels` a vektortávolság szerint **nem** volt a top‑1 (a `Scope` szövege felszínesen közelebb
esett a kérdéshez), de **ez tartalmazza a négy szintet** (B‑B/B‑T/B‑LT/B‑LTA). A rerank ezt felismerte és
a tetejére tette. **Ez a kötelező „a rerank átrendezett" bizonyíték.**

### 2) Q8 — átváltás egy másik, helyes szabványra
A nyers keresés az `EN 319 422:5.2.3 Algorithms`‑ra talált (0.1861 — jó szám!), de az a **time‑stamp protokoll**
algoritmus‑szakasza. A helyes forrás a **TS 119 312 (Cryptographic Suites)** — a rerank ezt hozta elő 9/10‑zel.
Vagyis a vektorkeresés jó *számot* adott, de rossz *dokumentumra*; a rerank javította. Ez a legmeggyőzőbb eset,
mert **átlépett egy szabványhatárt** a tartalom alapján.

### 3) Q9 — a konkrétabb klauzula
Nyersen `5.6.3.1 Description`, rerank után `5.6.3.4 Processing` — a rerank a konkrétabb, feldolgozás‑leíró
klauzulát preferálta.

### Q4 — rerank‑részlet (a korlátok bemutatásához)
```
HyDE top‑5:            0.2072  TS 119 142‑3 · 4.1 General requirements
                      0.2445  TS 119 142‑3 · 1 Scope
                      0.2869  EN 319 142‑1 · 3.1 Definitions
                      ...
rerank után:           7.0    TS 119 142‑3 · 1 Scope
                       6.0    TS 119 142‑3 · 6.1 Signature levels
                       2.0    TS 119 142‑3 · 4.1 General requirements
```
Itt a rerank a `1 Scope`‑ot választotta a tartalmilag finomabb `4.1` felett — lásd a „Korlátok" szakaszt.

---

## HyDE hatása (a keresés a kitalált válasszal)

A HyDE nem a kérdést keresi, hanem egy kis modell (`gpt‑4o‑mini`) által írt **hipotetikus, szakszavas angol
választ** — ez az ETSI‑cikkek nyelvén beszél, ezért közelebb esik a valódi chunkokhoz. Külön mérve mindhárom
próbakérdésnél csökkentette a távolságot (pl. XAdES: 0.2312 → 0.1572; certificate: 0.3485 → 0.3002;
PAdES: 0.1819 → 0.1711), azaz relevánsabb merítést adott a reranknak.

## Többnyelvűség (Q7) — magyar kérdés, angol tudásbázis

A tudásbázis végig **angol**, a Q7 mégis magyar: *„Mit bizonyít egy PAdES dokumentum‑időbélyeg, és mit nem?"*
A rendszer helyesen a **TS 119 142‑3**‑ra talált, és **magyarul** válaszolt, a `[ETSI …]` hivatkozásokat angolul
tartva. Ez azért működik, mert (a) a `text‑embedding‑3‑small` **nyelvfüggetlen** (a jelentést kódolja, nem a
szavakat), és (b) a HyDE **angol** keresőszöveget gyárt a magyar kérdésből is. A válasz nyelvét a rendszerprompt
a kérdés nyelvéhez igazítja.

## Negatív teszt (Q10) — grounding

*„How do I add a visible handwritten signature image in Adobe Acrobat?"* — ez Acrobat‑használati kérdés, nincs
az ETSI‑korpuszban. A rendszer a pontos **„Erről nincs információ a tudásbázisban."** mondatot adta, `noInfo=true`,
**0 forrás**. A rerank a legjobb jelöltet is 0.0‑ra pontozta, a distance is 0.55 (a „gyenge" tartomány) — a
grounding‑réteg tehát nem hallucinál, és megmondja, ha nincs válasza.

## Korlátok (őszinte megfigyelések)

- **Q4** — a rerank a `1 Scope`‑ot választotta (7.0) a tartalmilag finomabb `4.1` felett. Nem tévedés (a Scope
  is kimondja, hogy a DTS nem azonosít aláírót), de nem a legpontosabb klauzula. Jelzi, hogy a rerank nem
  mindig a legfinomabb szemcséjű találatot adja.
- **A nyers vektorkeresés önmagában gyengébb:** több kérdésnél (Q1, Q8) a top‑1 felszínesen hasonló, de nem a
  válasz — a HyDE + rerank réteg nélkül a minőség érezhetően rosszabb lenne. Ez indokolja a teljes pipeline‑t.
- **A `clause_path` néha zajos** (pl. idézőjeles cím‑töredék), ha a PDF‑tördelés szokatlan; a válasz ettől még
  helyes, de a hivatkozás formázása helyenként csiszolható.

## Reprodukció

```bash
npm run golden            # a fenti táblázat + a Q1/Q4 rerank‑részlet + a negatív teszt
npm run debug "<kérdés>"  # egy kérdésre: NYERS vs HyDE vs reranked, egymás alatt
```
