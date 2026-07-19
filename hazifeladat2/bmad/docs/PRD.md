# Product Requirements Document (PRD)
## Customer Location API

### 1. Áttekintés
Egy REST API szolgáltatás, amely ügyfelek földrajzi elhelyezkedését kezeli PostgreSQL adatbázis felett.

### 2. Funkcionális követelmények

#### 2.1 Adatmodell
- **customers tábla**
  - id (autoincrement primary key)
  - name (string, ügyfél neve)
  - telepules (string, település neve)
  - lat (float, nullable, földrajzi szélesség)
  - lon (float, nullable, földrajzi hosszúság)

#### 2.2 Seed adatok
- 15 magyar ügyfél betöltése
- Minden ügyfélhez koordináták a település alapján
- Idempotens seed (újrafuttatás nem hoz létre duplikátumot)

#### 2.3 API végpontok
- **GET /api/customers/count** - Ügyfelek számának lekérése
- **GET /api/customers/by-distance** - Ügyfelek távolság szerint rendezve Budapesttől

### 3. Nem-funkcionális követelmények
- Haversine képlet használata távolságszámításhoz
- Ékezet-független település-összehasonlítás
- Unit tesztek a távolságszámításra

### 4. Elfogadási kritériumok
- [ ] 15 ügyfél betöltve koordinátákkal
- [ ] /customers/count visszatér 15-tel
- [ ] /customers/by-distance távolság szerint rendez
- [ ] Unit teszt lefut és sikeres
