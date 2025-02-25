const fs = require("fs").promises;

async function verifyData() {
  try {
    const stats = {
      raw: {
        totalGames: 0,
        gamesWithBasicInfo: 0,
        missingFields: {},
        fieldCounts: {},
      },
      enriched: {
        totalGames: 0,
        gamesWithCompanies: 0,
        gamesWithPlatforms: 0,
        gamesWithGameModes: 0,
        gamesWithGenres: 0,
        gamesWithSummary: 0,
        gamesWithCover: 0,
        gamesWithRating: 0,
      },
      comparison: {
        matchingGameCount: true,
        missingGames: [],
        dataIntegrity: {},
      },
    };

    // Read both files
    console.log("Reading data files...");
    const [rawGames, enrichedGames] = await Promise.all([
      fs.readFile("games_partial.json", "utf8").then(JSON.parse),
      fs.readFile("games_enriched.json", "utf8").then(JSON.parse),
    ]);

    // Verify raw data
    console.log("\nVerifying raw data...");
    stats.raw.totalGames = rawGames.length;
    const requiredFields = ["id", "name"];

    rawGames.forEach((game) => {
      // Check required fields
      if (requiredFields.every((field) => game[field])) {
        stats.raw.gamesWithBasicInfo++;
      }

      // Count all fields
      Object.keys(game).forEach((field) => {
        stats.raw.fieldCounts[field] = (stats.raw.fieldCounts[field] || 0) + 1;
        if (game[field] === null || game[field] === undefined) {
          stats.raw.missingFields[field] =
            (stats.raw.missingFields[field] || 0) + 1;
        }
      });
    });

    // Verify enriched data
    console.log("Verifying enriched data...");
    stats.enriched.totalGames = enrichedGames.length;

    enrichedGames.forEach((game) => {
      if (game.companies?.length > 0) stats.enriched.gamesWithCompanies++;
      if (game.platforms?.length > 0) stats.enriched.gamesWithPlatforms++;
      if (game.game_modes?.length > 0) stats.enriched.gamesWithGameModes++;
      if (game.genres?.length > 0) stats.enriched.gamesWithGenres++;
      if (game.summary) stats.enriched.gamesWithSummary++;
      if (game.cover) stats.enriched.gamesWithCover++;
      if (game.total_rating) stats.enriched.gamesWithRating++;
    });

    // Compare datasets
    console.log("Comparing datasets...");
    stats.comparison.matchingGameCount =
      rawGames.length === enrichedGames.length;

    // Create sets of game IDs
    const rawIds = new Set(rawGames.map((g) => g.id));
    const enrichedIds = new Set(enrichedGames.map((g) => g.id));

    // Find missing games
    rawIds.forEach((id) => {
      if (!enrichedIds.has(id)) {
        stats.comparison.missingGames.push(id);
      }
    });

    // Check data integrity
    const sampleSize = Math.min(100, rawGames.length);
    const sampleGames = rawGames.slice(0, sampleSize);

    sampleGames.forEach((rawGame) => {
      const enrichedGame = enrichedGames.find((g) => g.id === rawGame.id);
      if (enrichedGame) {
        // Compare fields that should match
        const fieldsToCompare = [
          "name",
          "first_release_date",
          "summary",
          "total_rating",
        ];
        fieldsToCompare.forEach((field) => {
          if (!stats.comparison.dataIntegrity[field]) {
            stats.comparison.dataIntegrity[field] = {
              matches: 0,
              mismatches: 0,
            };
          }
          if (rawGame[field] === enrichedGame[field]) {
            stats.comparison.dataIntegrity[field].matches++;
          } else {
            stats.comparison.dataIntegrity[field].mismatches++;
          }
        });
      }
    });

    // Calculate percentages
    const percentages = {
      raw: {
        gamesWithBasicInfo:
          ((stats.raw.gamesWithBasicInfo / stats.raw.totalGames) * 100).toFixed(
            2
          ) + "%",
        fieldCompleteness: Object.fromEntries(
          Object.entries(stats.raw.fieldCounts).map(([field, count]) => [
            field,
            ((count / stats.raw.totalGames) * 100).toFixed(2) + "%",
          ])
        ),
      },
      enriched: {
        companiesRate:
          (
            (stats.enriched.gamesWithCompanies / stats.enriched.totalGames) *
            100
          ).toFixed(2) + "%",
        platformsRate:
          (
            (stats.enriched.gamesWithPlatforms / stats.enriched.totalGames) *
            100
          ).toFixed(2) + "%",
        gameModesRate:
          (
            (stats.enriched.gamesWithGameModes / stats.enriched.totalGames) *
            100
          ).toFixed(2) + "%",
        genresRate:
          (
            (stats.enriched.gamesWithGenres / stats.enriched.totalGames) *
            100
          ).toFixed(2) + "%",
        summaryRate:
          (
            (stats.enriched.gamesWithSummary / stats.enriched.totalGames) *
            100
          ).toFixed(2) + "%",
        coverRate:
          (
            (stats.enriched.gamesWithCover / stats.enriched.totalGames) *
            100
          ).toFixed(2) + "%",
        ratingRate:
          (
            (stats.enriched.gamesWithRating / stats.enriched.totalGames) *
            100
          ).toFixed(2) + "%",
      },
    };

    // Generate final report
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      percentages,
      summary: {
        status: stats.comparison.matchingGameCount ? "SUCCESS" : "WARNING",
        missingGamesCount: stats.comparison.missingGames.length,
        dataQualityScore:
          (
            ((stats.enriched.gamesWithCompanies +
              stats.enriched.gamesWithPlatforms +
              stats.enriched.gamesWithGameModes +
              stats.enriched.gamesWithGenres) /
              (stats.enriched.totalGames * 4)) *
            100
          ).toFixed(2) + "%",
      },
    };

    // Save report
    await fs.writeFile(
      "data_verification_report.json",
      JSON.stringify(report, null, 2)
    );

    console.log(
      "\nVerification complete! Check data_verification_report.json for detailed results."
    );
    console.log("\nQuick Summary:");
    console.log(`Total Raw Games: ${stats.raw.totalGames}`);
    console.log(`Total Enriched Games: ${stats.enriched.totalGames}`);
    console.log(`Data Quality Score: ${report.summary.dataQualityScore}`);
    console.log(`Status: ${report.summary.status}`);
  } catch (error) {
    console.error("Verification failed:", error);
  }
}

verifyData();
