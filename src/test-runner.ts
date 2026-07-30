// Manual test runner for critical functions
import { haversine } from './utils/distance';
import { findCoordinates } from './utils/geocoding';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | Promise<boolean>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then((passed) => {
          results.push({ name, passed });
          console.log(passed ? `✓ ${name}` : `✗ ${name}`);
        })
        .catch((error) => {
          results.push({ name, passed: false, error: String(error) });
          console.error(`✗ ${name}: ${error}`);
        });
    } else {
      results.push({ name, passed: result });
      console.log(result ? `✓ ${name}` : `✗ ${name}`);
    }
  } catch (error) {
    results.push({ name, passed: false, error: String(error) });
    console.error(`✗ ${name}: ${error}`);
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
      }
    },
    toBeCloseTo(expected: number, decimals: number = 2) {
      if (typeof actual !== 'number') {
        throw new Error(`Expected number, got ${typeof actual}`);
      }
      const factor = Math.pow(10, decimals);
      if (Math.round(actual * factor) !== Math.round(expected * factor)) {
        throw new Error(`Expected ~${expected}, got ${actual}`);
      }
    },
  };
}

console.log('\n🧪 Running Manual Tests...\n');

// Haversine Tests
console.log('Haversine Distance Tests:');
test('Budapest → Vienna ≈ 214.0 km', () => {
  const budapest = { lat: 47.4979, lon: 19.0402 };
  const vienna = { lat: 48.2082, lon: 16.3738 };
  const distance = haversine(budapest.lat, budapest.lon, vienna.lat, vienna.lon);
  expect(distance).toBeCloseTo(214.0, 0);
  return true;
});

test('Budapest → Budapest = 0.0 km', () => {
  const budapest = { lat: 47.4979, lon: 19.0402 };
  const distance = haversine(budapest.lat, budapest.lon, budapest.lat, budapest.lon);
  expect(distance).toBe(0.0);
  return true;
});

test('Null coordinates → null (no throw)', () => {
  expect(haversine(null, 19.0402, 47.4979, 19.0402)).toBeNull();
  expect(haversine(47.4979, null, 47.4979, 19.0402)).toBeNull();
  expect(haversine(null, null, null, null)).toBeNull();
  return true;
});

test('Distance rounded to 1 decimal place', () => {
  const budapest = { lat: 47.4979, lon: 19.0402 };
  const prague = { lat: 50.0755, lon: 14.4378 };
  const distance = haversine(budapest.lat, budapest.lon, prague.lat, prague.lon);
  if (distance === null) throw new Error('Distance should not be null');
  expect((distance * 10) % 1).toBe(0);
  return true;
});

// Geocoding Tests
console.log('\nGeocoding Tests:');
test('Find coordinates for exact city name', () => {
  const coords = findCoordinates('Budapest');
  expect(coords).toEqual({ lat: 47.4979, lon: 19.0402 });
  return true;
});

test('Find coordinates for lowercase city name', () => {
  const coords = findCoordinates('budapest');
  expect(coords).toEqual({ lat: 47.4979, lon: 19.0402 });
  return true;
});

test('Find coordinates for city with diacritics', () => {
  const coords = findCoordinates('Kraków');
  expect(coords).toEqual({ lat: 50.0647, lon: 19.9450 });
  return true;
});

test('Find coordinates with whitespace trim', () => {
  const coords = findCoordinates('  Prague  ');
  expect(coords).toEqual({ lat: 50.0755, lon: 14.4378 });
  return true;
});

test('Return null for unknown city', () => {
  const coords = findCoordinates('Unknown');
  expect(coords).toBeNull();
  return true;
});

test('Return null for empty string', () => {
  const coords = findCoordinates('');
  expect(coords).toBeNull();
  return true;
});

// Summary
setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\n✓ Tests passed: ${passed}/${total}\n`);

  if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}${r.error ? ': ' + r.error : ''}`);
    });
    process.exit(1);
  }
}, 100);
