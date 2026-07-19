-- Csak induláskor, egyszer fut le (a postgres image entrypointja hívja),
-- a superuser 'plantbase' role-lal, a 'plantbase' adatbázisban.
--
-- Létrehoz egy KIZÁRÓLAG OLVASÓ (SELECT) jogú DB role-t. Az agent runSql toolja
-- ezen a kapcsolaton keresztül fut — ez a legfontosabb biztonsági határ:
-- még ha az SQL-szűrő ki is hagyna valamit, a DB szinten sincs írási jog.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'plantbase_ro') THEN
    CREATE ROLE plantbase_ro LOGIN PASSWORD 'plantbase_ro';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE plantbase TO plantbase_ro;
GRANT USAGE ON SCHEMA public TO plantbase_ro;

-- Meglévő táblák olvashatók.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO plantbase_ro;

-- A később (Prisma migrációval, a 'plantbase' role-lal) létrehozott táblákra is
-- automatikusan SELECT jogot kap a read-only role.
ALTER DEFAULT PRIVILEGES FOR ROLE plantbase IN SCHEMA public
  GRANT SELECT ON TABLES TO plantbase_ro;

-- Biztonság kedvéért: semmilyen írási/DDL jog ne legyen (alapból sincs, ez explicit).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM plantbase_ro;
