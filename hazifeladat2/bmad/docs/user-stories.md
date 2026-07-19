# User Stories

## Story 1: Ügyféladatok betöltése
**Szereplő:** Rendszeradminisztrátor
**Cél:** 15 ügyfél betöltése az adatbázisba
**Elfogadási kritérium:**
- seed-customers.json tartalmaz 15 ügyfelet
- Minden ügyfél kap koordinátát a települése alapján
- Újrafuttatás nem hoz létre duplikátumot

## Story 2: Ügyfelek számának lekérése
**Szereplő:** API fogyasztó
**Cél:** Megtudni, hány ügyfél van az adatbázisban
**Elfogadási kritérium:**
- GET /api/customers/count végpont elérhető
- JSON válasz: { count: szám }

## Story 3: Ügyfelek távolság szerint
**Szereplő:** API fogyasztó
**Cél:** Ügyfelek listázása Budapesttől mért távolság szerint
**Elfogadási kritérium:**
- GET /api/customers/by-distance végpont elérhető
- Válasz tartalmazza az ügyfelek távolságát km-ben
- Lista távolság szerint növekvően rendezett

## Story 4: Távolságszámítás tesztelése
**Szereplő:** Fejlesztő
**Cél:** Haversine képlet helyességének ellenőrzése
**Elfogadási kritérium:**
- Unit teszt futtatható
- Budapest-Debrecen távolság kb 191 km
