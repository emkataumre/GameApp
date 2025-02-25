const axios = require("axios");
const fs = require("fs").promises;

const BASE_URL = "https://api.igdb.com/v4";
const ACCESS_TOKEN = "fir5jpvzjibmfz9uo5tm9m9dwbfue1";
const CLIENT_ID = "znsfyea6eb6di8exu84z0iczz5ncaj";

const ENDPOINTS = {
  involved_companies: {
    url: `${BASE_URL}/involved_companies`,
    fields: "fields company,developer,publisher;",
  },
  companies: {
    url: `${BASE_URL}/companies`,
    fields: "fields name,websites;",
  },
  game_modes: {
    url: `${BASE_URL}/game_modes`,
    fields: "fields name;",
  },
  platforms: {
    url: `${BASE_URL}/platforms`,
    fields: "fields name,abbreviation;",
  },
  genres: {
    url: `${BASE_URL}/genres`,
    fields: "fields name;",
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchFromEndpoint(endpoint, query) {
  try {
    const response = await axios.post(endpoint, query, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Client-ID": CLIENT_ID,
        "Content-Type": "text/plain",
      },
    });
    await sleep(250); // Minimum delay required
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, {
      status: error.response?.status,
      title: error.response?.statusText,
    });
    throw error;
  }
}

async function processGameChunk(games, startIndex, stats) {
  const ids = {
    involved_companies: new Set(),
    companies: new Set(),
    game_modes: new Set(),
    platforms: new Set(),
    genres: new Set(),
  };

  games.forEach((game) => {
    if (game.involved_companies)
      game.involved_companies.forEach((id) => ids.involved_companies.add(id));
    if (game.platforms) game.platforms.forEach((id) => ids.platforms.add(id));
    if (game.game_modes)
      game.game_modes.forEach((id) => ids.game_modes.add(id));
    if (game.genres) game.genres.forEach((id) => ids.genres.add(id));
  });

  const relatedData = {
    involved_companies: {},
    companies: {},
    game_modes: {},
    platforms: {},
    genres: {},
  };

  // Update stats for API calls
  try {
    const involvedCompanies = await fetchInBatches(
      "involved_companies",
      ids.involved_companies,
      50
    );
    stats.successfulApiCalls++;
    involvedCompanies.forEach((ic) => {
      relatedData.involved_companies[ic.id] = ic;
      if (ic.company) ids.companies.add(ic.company);
    });
  } catch (error) {
    stats.failedApiCalls++;
    throw error;
  }

  try {
    const companies = await fetchInBatches("companies", ids.companies, 50);
    stats.successfulApiCalls++;
    companies.forEach((company) => {
      relatedData.companies[company.id] = company;
    });
  } catch (error) {
    stats.failedApiCalls++;
    throw error;
  }

  try {
    const [platforms, gameModes, genres] = await Promise.all([
      fetchInBatches("platforms", ids.platforms, 50),
      fetchInBatches("game_modes", ids.game_modes, 50),
      fetchInBatches("genres", ids.genres, 50),
    ]);
    stats.successfulApiCalls += 3;

    platforms.forEach(
      (platform) => (relatedData.platforms[platform.id] = platform)
    );
    gameModes.forEach((mode) => (relatedData.game_modes[mode.id] = mode));
    genres.forEach((genre) => (relatedData.genres[genre.id] = genre));
  } catch (error) {
    stats.failedApiCalls++;
    throw error;
  }

  return games.map((game) => {
    const enrichedGame = {
      ...game,
      companies: game.involved_companies
        ? game.involved_companies
            .map((id) => {
              const ic = relatedData.involved_companies[id];
              if (!ic || !ic.company) {
                stats.missingRelationships.companies.push(game.id);
                return null;
              }
              const company = relatedData.companies[ic.company];
              if (!company) {
                stats.missingRelationships.companies.push(game.id);
                return null;
              }
              return {
                name: company.name,
                role: {
                  developer: ic.developer || false,
                  publisher: ic.publisher || false,
                },
              };
            })
            .filter(Boolean)
        : [],
      platforms: game.platforms
        ? game.platforms
            .map((id) => {
              const platform = relatedData.platforms[id];
              if (!platform) {
                stats.missingRelationships.platforms.push(game.id);
                return null;
              }
              return {
                name: platform.name,
                abbreviation: platform.abbreviation,
              };
            })
            .filter(Boolean)
        : [],
      game_modes: game.game_modes
        ? game.game_modes
            .map((id) => {
              const mode = relatedData.game_modes[id];
              if (!mode) {
                stats.missingRelationships.gameModes.push(game.id);
                return null;
              }
              return { name: mode.name };
            })
            .filter(Boolean)
        : [],
      genres: game.genres
        ? game.genres
            .map((id) => {
              const genre = relatedData.genres[id];
              if (!genre) {
                stats.missingRelationships.genres.push(game.id);
                return null;
              }
              return { name: genre.name };
            })
            .filter(Boolean)
        : [],
    };

    // Update completion stats
    if (enrichedGame.companies.length > 0) stats.gamesWithCompanies++;
    if (enrichedGame.platforms.length > 0) stats.gamesWithPlatforms++;
    if (enrichedGame.game_modes.length > 0) stats.gamesWithGameModes++;
    if (enrichedGame.genres.length > 0) stats.gamesWithGenres++;

    delete enrichedGame.involved_companies;
    return enrichedGame;
  });
}

async function fetchInBatches(endpoint, ids, batchSize = 50) {
  if (ids.size === 0) return [];

  const idArray = Array.from(ids);
  const results = [];

  for (let i = 0; i < idArray.length; i += batchSize) {
    const batch = idArray.slice(i, i + batchSize);

    try {
      const query = `${ENDPOINTS[endpoint].fields} where id = (${batch.join(
        ","
      )});`;
      const response = await fetchFromEndpoint(ENDPOINTS[endpoint].url, query);
      results.push(...response);
    } catch (error) {
      console.error(`Batch failed:`, {
        batch: batch.join(","),
        error: error.message,
      });
    }
  }

  return results;
}

function validateRelatedData(relatedData, stats) {
  const missing = {
    involved_companies: 0,
    companies: 0,
    platforms: 0,
    game_modes: 0,
    genres: 0,
  };

  Object.keys(relatedData).forEach((key) => {
    if (!relatedData[key] || Object.keys(relatedData[key]).length === 0) {
      missing[key]++;
      console.warn(`Warning: No ${key} data found`);
    }
  });

  return missing;
}

async function main() {
  try {
    const stats = {
      totalGames: 0,
      gamesWithCompanies: 0,
      gamesWithPlatforms: 0,
      gamesWithGameModes: 0,
      gamesWithGenres: 0,
      successfulApiCalls: 0,
      failedApiCalls: 0,
      missingRelationships: {
        companies: [],
        platforms: [],
        gameModes: [],
        genres: [],
      },
    };

    console.log("Reading games data...");
    const allGames = JSON.parse(
      await fs.readFile("games_partial.json", "utf8")
    );
    stats.totalGames = allGames.length;
    console.log(`Total games to process: ${allGames.length}`);

    const CHUNK_SIZE = 50;
    const enrichedGames = [];

    for (let i = 0; i < allGames.length; i += CHUNK_SIZE) {
      const chunk = allGames.slice(i, i + CHUNK_SIZE);
      console.log(
        `\nProcessing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(
          allGames.length / CHUNK_SIZE
        )}`
      );

      try {
        const enrichedChunk = await processGameChunk(chunk, i, stats);
        enrichedGames.push(...enrichedChunk);

        // Save progress and stats every 1000 games
        if (enrichedGames.length % 1000 === 0) {
          await Promise.all([
            fs.writeFile(
              "games_enriched.json",
              JSON.stringify(enrichedGames, null, 2)
            ),
            fs.writeFile(
              "enrichment_stats.json",
              JSON.stringify(
                {
                  ...stats,
                  completenessRate: {
                    companies:
                      (
                        (stats.gamesWithCompanies / stats.totalGames) *
                        100
                      ).toFixed(2) + "%",
                    platforms:
                      (
                        (stats.gamesWithPlatforms / stats.totalGames) *
                        100
                      ).toFixed(2) + "%",
                    gameModes:
                      (
                        (stats.gamesWithGameModes / stats.totalGames) *
                        100
                      ).toFixed(2) + "%",
                    genres:
                      (
                        (stats.gamesWithGenres / stats.totalGames) *
                        100
                      ).toFixed(2) + "%",
                  },
                  apiSuccess:
                    (
                      (stats.successfulApiCalls /
                        (stats.successfulApiCalls + stats.failedApiCalls)) *
                      100
                    ).toFixed(2) + "%",
                },
                null,
                2
              )
            ),
          ]);
          console.log(
            `Saved progress: ${enrichedGames.length}/${allGames.length} games`
          );
        }

        await sleep(500);
      } catch (error) {
        console.error(`Error processing chunk starting at ${i}:`, error);
      }
    }

    // Final save with complete stats
    await Promise.all([
      fs.writeFile(
        "games_enriched.json",
        JSON.stringify(enrichedGames, null, 2)
      ),
      fs.writeFile(
        "enrichment_stats.json",
        JSON.stringify(
          {
            ...stats,
            completenessRate: {
              companies:
                ((stats.gamesWithCompanies / stats.totalGames) * 100).toFixed(
                  2
                ) + "%",
              platforms:
                ((stats.gamesWithPlatforms / stats.totalGames) * 100).toFixed(
                  2
                ) + "%",
              gameModes:
                ((stats.gamesWithGameModes / stats.totalGames) * 100).toFixed(
                  2
                ) + "%",
              genres:
                ((stats.gamesWithGenres / stats.totalGames) * 100).toFixed(2) +
                "%",
            },
            apiSuccess:
              (
                (stats.successfulApiCalls /
                  (stats.successfulApiCalls + stats.failedApiCalls)) *
                100
              ).toFixed(2) + "%",
          },
          null,
          2
        )
      ),
    ]);

    console.log(`\nSuccessfully processed all ${enrichedGames.length} games`);
    console.log("Check enrichment_stats.json for detailed statistics");

    const dataValidation = validateRelatedData(relatedData, stats);
    if (Object.values(dataValidation).some((count) => count > 0)) {
      console.warn("Warning: Some related data is missing:", dataValidation);
    }
  } catch (error) {
    console.error("Main error:", error);
  }
}

main();
