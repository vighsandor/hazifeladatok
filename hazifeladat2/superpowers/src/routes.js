const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { haversineDistance } = require("./haversine");

const router = express.Router();
const prisma = new PrismaClient();

const BUDAPEST = { lat: 47.4979, lon: 19.0402 };

router.get("/customers/count", async (req, res) => {
  try {
    const count = await prisma.customer.count();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/customers/by-distance", async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        lat: { not: null },
        lon: { not: null }
      }
    });
    
    const withDistance = customers.map(c => ({
      id: c.id,
      name: c.name,
      telepules: c.telepules,
      distance: haversineDistance(BUDAPEST.lat, BUDAPEST.lon, c.lat, c.lon)
    }));
    
    withDistance.sort((a, b) => a.distance - b.distance);
    
    res.json(withDistance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
