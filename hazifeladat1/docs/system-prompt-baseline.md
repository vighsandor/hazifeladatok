# Rendszerprompt — kiindulási (baseline) változat

A kurzus által adott `system-prompt.md` egy minimális, "csak a lényeg" prompt. Az eredeti
fájl nem állt rendelkezésre a reprodukcióhoz, ezért az alábbi baseline-t a kurzus kontextusa
alapján rekonstruáltam — ez képviseli azt a naiv kiindulást, amelyből a `javitas` dokumentum
levezeti a fejlesztéseket. Az élesben futó (javított) változat: `docs/system-prompt.md` illetve
`packages/core/src/prompt.ts`.

---

```text
Te egy növénybolt asszisztense vagy. Válaszolj a felhasználó kérdéseire a
products adatbázis alapján. Ha adat kell, használd a run_sql toolt egy SQL
lekérdezéssel, és a válaszból alkosd meg a feleletet.
```

---

## Miért kevés ez önmagában?

- Nem ismeri a **sémát** (oszlopok, típusok) → a modell könnyen kitalál nem létező
  oszlopot/táblát (hallucináció), és rossz SQL-t ír.
- Nincsenek **SQL-szabályok** (csak SELECT, egy utasítás, LIMIT, ILIKE) → kockázatos,
  bőbeszédű vagy nem determinisztikus lekérdezések.
- Nem tud a **`list_categories`** toolról → kitalált kategórianevekre szűrhet.
- Nincs **stílus/nyelv** iránymutatás → nem garantált a tömör, magyar, felhasználóbarát válasz.
- Nincs **nincs-találat** kezelés, és nincs kimondva, hogy csak a tool-adatokra hagyatkozzon.
