import { describe, it, expect } from 'vitest';
import { assertReadOnlySelect, MAX_ROWS } from './sql-guard';

describe('assertReadOnlySelect', () => {
  it('elfogadja az egyszerű SELECT-et és rátesz LIMIT-et', () => {
    const out = assertReadOnlySelect('SELECT * FROM products');
    expect(out).toBe(`SELECT * FROM products LIMIT ${MAX_ROWS}`);
  });

  it('elfogadja a WITH ... SELECT (CTE) lekérdezést', () => {
    const out = assertReadOnlySelect(
      'WITH p AS (SELECT * FROM products) SELECT count(*) FROM p LIMIT 5',
    );
    expect(out).toContain('WITH');
    expect(out).toContain('LIMIT 5');
  });

  it('megőrzi a meglévő LIMIT-et', () => {
    const out = assertReadOnlySelect('SELECT name FROM products LIMIT 3');
    expect(out).toBe('SELECT name FROM products LIMIT 3');
  });

  it('levágja a záró pontosvesszőt', () => {
    const out = assertReadOnlySelect('SELECT 1;');
    expect(out).toBe(`SELECT 1 LIMIT ${MAX_ROWS}`);
  });

  it('elutasítja az üres bemenetet', () => {
    expect(() => assertReadOnlySelect('   ')).toThrow();
  });

  it('elutasítja a nem-SELECT lekérdezést', () => {
    expect(() => assertReadOnlySelect('UPDATE products SET price = 0')).toThrow();
    expect(() => assertReadOnlySelect('DELETE FROM products')).toThrow();
    expect(() => assertReadOnlySelect('DROP TABLE products')).toThrow();
  });

  it('elutasítja a több utasítást (SQL injection próba)', () => {
    expect(() => assertReadOnlySelect('SELECT 1; DROP TABLE products')).toThrow();
  });

  it('elutasítja az adatmódosító CTE-t', () => {
    expect(() =>
      assertReadOnlySelect('WITH x AS (DELETE FROM products RETURNING *) SELECT * FROM x'),
    ).toThrow();
  });

  it('elutasítja a SELECT ... INTO írási formát', () => {
    expect(() => assertReadOnlySelect('SELECT * INTO backup FROM products')).toThrow();
  });
});
