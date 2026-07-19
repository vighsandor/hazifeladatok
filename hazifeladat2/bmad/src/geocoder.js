const telepulesek = require("../prisma/telepulesek.json");

function normalizeText(text) {
  const accents = {
    "á": "a", "é": "e", "í": "i", "ó": "o", "ö": "o", "ő": "o",
    "ú": "u", "ü": "u", "ű": "u",
    "Á": "A", "É": "E", "Í": "I", "Ó": "O", "Ö": "O", "Ő": "O",
    "Ú": "U", "Ü": "U", "Ű": "U"
  };
  return text.toLowerCase().split("").map(c => accents[c] || c).join("");
}

function geocodeTelepules(telepulesName) {
  const normalized = normalizeText(telepulesName);
  for (const [name, coords] of Object.entries(telepulesek)) {
    if (normalizeText(name) === normalized) {
      return coords;
    }
  }
  return null;
}

module.exports = { geocodeTelepules, normalizeText };
