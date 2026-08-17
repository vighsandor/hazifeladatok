# A tíz fájdalom — mit oldok meg, és mit nem (összegző)

A kiírás a cégvezető tíz fájdalmát sorolja, és azt kéri, hogy az ügyfélirányú use case **legalább kettőt**
oldjon meg közülük, és **mondjam ki, melyiket nem**. Ezt szedem itt össze egy helyen. A rendszerem az ETSI
e-aláírás tudásbázisra épülő, ügyfél felé forduló önkiszolgáló asszisztens (`/support`), amely 24/7,
forrásmegjelölt választ ad, és bizonytalanságnál emberhez irányít.

## Amit megoldok

A kötelező minimumot (≥2) teljesítem: a **#1** és a **#2** teljesen megoldott, a **#9** szintén, a **#3** részben.

| # | Fájdalom (a cégvezető szavaival) | Hogyan oldom meg | Mérték |
|---|---|---|---|
| **#1** | „Az ügyfeleink munkaidőn kívül nem kapnak választ, pedig akkor is keresnek minket." | Az asszisztensem **0–24 órában** válaszol; nincs munkaidőhöz kötve. | teljesen |
| **#2** | „Ugyanazokat a kérdéseket válaszoljuk meg naponta százszor, a kollégák jobbat is tudnának csinálni." | Az ismétlődő szabvány-kérdéseket az asszisztensem **leveszi a supportról** (a deflektált arányt mérem); a kolléga a nehéz esetekre marad. | teljesen |
| **#9** | „Az ügyfél attól függően kap más választ, hogy éppen ki veszi fel." | A **grounding** miatt minden ügyfél **ugyanazt a forrásmegjelölt választ** kapja, a konkrét ETSI klauzulára hivatkozva — nem függ attól, ki és mikor válaszol. | teljesen |
| **#3** | „Az új ügyfél az első hetekben elveszettnek érzi magát, és ilyenkor veszítjük el a legtöbbet." | Az új ügyfél a kérdéseire **azonnal, hivatkozott választ** kap, ami segít az önálló eligazodásban. | részben — a kérdésekre válaszolok, de **nem vezetem végig proaktívan** az onboardingon |

## Amit nem oldok meg — és pontosan miért

Ezekhez a rendszerem **nem nyúl, és nem is ígérem, hogy hozzányúl**. Mindegyiknél az az ok, hogy olyan adatra
vagy rendszerre lenne szükség, ami a PoC-omban **nincs** (a PoC csak a nyilvános ETSI tudásbázist látja,
ügyfél- és tranzakcióadatot nem).

| # | Fájdalom | Miért nem oldom meg |
|---|---|---|
| **#4** | „Az ügyfél nem látja, hol tart az ügye…" | Élő hozzáférés kellene a **CRM-hez / ügykövető rendszerhez**; a PoC-nak nincs ügy- vagy rendelésadata, csak a szabvány-tudásbázis. |
| **#5** | „Személyre szabott kiszolgálást csak a legnagyobb ügyfeleknek…" | **Ügyfélprofil / szegmens-adat** kellene; a PoC minden kérdést azonosan kezel, ügyféladat nélkül. |
| **#6** | „Amit az ügyfeleink kérdeznek és panaszolnak, abból ma semmit nem tanulunk." | Külön **visszacsatolási / elemzési kör** kellene a panaszokra; a PoC naplózza az interakciókat, de ma **nem bányászom** őket terméktanulságért. |
| **#7** | „Mire üzletet kötünk, hetek mennek el papírmunkával…" | **Szerződés- és aláírás-folyamat orchestrációja** kellene; a PoC kérdésekre válaszol, papírmunkát nem mozgat. |
| **#8** | „Amikor az ügyfélnek tényleg baja van, ugyanabban a sorban áll…" | **Sürgősség/tét szerinti prioritizálás** kellene; a PoC **magabiztosság** alapján eszkalál (`topScore < 6`), nem a tét alapján. (Ezt a kérdéslap B) pontjában külön kimondom mint vállalt korlátot.) |
| **#10** | „A távozó ügyfél nem szól előre, csak csendben eltűnik." | **Viselkedési / lemorzsolódási jelek elemzése** kellene; a PoC-nak nincs ügyfél-viselkedési adata. |

## Egy mondatban

A **#1, #2, #9** fájdalmat oldom meg (és a **#3**-at részben) — mind olyan, ami **tudás- és válaszjellegű**,
tehát a meglévő RAG-omra ráépül. A **#4–#8, #10** kimarad, mert azok **ügyfél-, tranzakció- vagy viselkedési
adatot** igényelnének, ami a PoC-om hatókörén kívül esik. Ezt tudatosan vállalom: jobbnak tartom kimondani,
mit nem tud a rendszerem, mint túlígérni.
