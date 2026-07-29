# Ellenőrző adatok (mindkét branch kimenetét ezzel vetheted össze)

> Ez **megosztott bemeneti / ellenőrző adat**, nem harness-kód. Nyugodtan használhatod
> mindkét ágon ugyanezt a koordináta-referenciát (ahogy a `seed-customers.json` is közös) —
> attól még a KÓD, amit a két harness ír (modulszerkezet, migráció, tesztstílus,
> hibakezelés), különbözni fog, és a dolgozat épp ezt hasonlítja össze.

## A 15 város koordinátái (WGS84, város-központ)

Ezek stabil, ismert koordináták. Ellenőrizve: velük a Budapest–Bécs táv pontosan 214,0 km,
ahogy a kiírás várja.

| Település   | lat       | lon       |
|-------------|-----------|-----------|
| Budapest    | 47.4979   | 19.0402   |
| Vienna      | 48.2082   | 16.3738   |
| Munich      | 48.1351   | 11.5820   |
| Milan       | 45.4642   |  9.1900   |
| Barcelona   | 41.3874   |  2.1686   |
| Lyon        | 45.7640   |  4.8357   |
| Kraków      | 50.0647   | 19.9450   |
| Prague      | 50.0755   | 14.4378   |
| Lisbon      | 38.7223   | -9.1393   |
| Amsterdam   | 52.3676   |  4.9041   |
| Stockholm   | 59.3293   | 18.0686   |
| Ljubljana   | 46.0569   | 14.5058   |
| Bucharest   | 44.4268   | 26.1025   |
| Dublin      | 53.3498   | -6.2603   |
| Copenhagen  | 55.6761   | 12.5683   |

## Elvárt sorrend a `GET /customers/by-distance` végponton

Budapesttől növekvő távolság szerint (a seedben minden városból 1 ügyfél van, ezért
egyértelmű a sorrend; holtverseny nincs, de ha lenne, `name` dönt):

| # | distanceKm | város (ügyfél)            |
|---|-----------:|---------------------------|
| 1 |        0.0 | Budapest (Anna Kovács)    |
| 2 |      214.0 | Vienna (Lena Fischer)     |
| 3 |      293.0 | Kraków (Katarzyna Nowak)  |
| 4 |      380.6 | Ljubljana (Matej Horvat)  |
| 5 |      442.4 | Prague (Petra Horáková)   |
| 6 |      561.2 | Munich (Jonas Weber)      |
| 7 |      643.5 | Bucharest (Elena Popescu) |
| 8 |      786.8 | Milan (Sofia Rossi)       |
| 9 |     1012.3 | Copenhagen (Kristofer N.) |
|10 |     1100.0 | Lyon (Lucas Dubois)       |
|11 |     1144.8 | Amsterdam (Sanne de Vries)|
|12 |     1317.1 | Stockholm (Emma Andersson)|
|13 |     1497.6 | Barcelona (Diego Martín)  |
|14 |     1894.7 | Dublin (Niamh O'Brien)    |
|15 |     2469.4 | Lisbon (Isabella Silva)   |

- `GET /customers/count` -> `{ "count": 15 }`
- Ha szándékosan kiveszel egy koordinátát a referenciából (teszteléshez), az az ügyfél a
  lista VÉGÉRE kerül `distanceKm: null`-lal, és a count akkor is 15 marad.

## Unit teszt kulcsértékei (haversine)

- Budapest → Vienna: **214,0 km** (ismert táv)
- Budapest → Budapest: **0,0 km**
- null-koordinátás ügyfél: `distanceKm = null`, és a végére rendezve
