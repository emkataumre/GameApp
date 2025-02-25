const fs = require("fs").promises;

async function cleanup() {
  const files = [
    "games_partial.json",
    "games_enriched.json",
    "games_enriched_fixed.json",
    "enrichment_stats.json",
  ];

  for (const file of files) {
    try {
      await fs.unlink(file);
      console.log(`Deleted ${file}`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`Error deleting ${file}:`, error);
      }
    }
  }
}

cleanup();
