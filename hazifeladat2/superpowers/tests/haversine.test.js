const { describe, it } = require("node:test");
const assert = require("node:assert");
const { haversineDistance } = require("../src/haversine");

describe("Haversine távolságszámítás", () => {
  it("Budapest és Debrecen távolsága kb 191 km", () => {
    const dist = haversineDistance(47.4979, 19.0402, 47.5316, 21.6273);
    const ok = dist > 190 && dist < 192;
    assert.ok(ok, "Vart: ~191 km, kapott: " + dist.toFixed(2) + " km");
  });

  it("Azonos pont távolsága 0", () => {
    const dist = haversineDistance(47.4979, 19.0402, 47.4979, 19.0402);
    assert.strictEqual(dist, 0);
  });

  it("Pozitív távolság bármely két különböző pont között", () => {
    const dist = haversineDistance(47.4979, 19.0402, 46.0727, 18.2324);
    assert.ok(dist > 0, "A távolságnak pozitívnak kell lennie");
  });
});
