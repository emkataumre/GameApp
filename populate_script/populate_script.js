/**
 * Game Data Population Script
 *
 * This script fetches video game data from the IGDB API and saves it locally.
 * It collects comprehensive game information including:
 * - Basic game details (name, release date, summary, ratings)
 * - Game modes (single player, multiplayer, etc.)
 * - Platforms (PC, consoles, etc.)
 * - Genres
 * - Companies (developers and publishers)
 * - Company websites
 *
 * The script:
 * 1. Fetches games in batches of 500 from the IGDB API
 * 2. For each batch, collects IDs of related entities (platforms, genres, etc.)
 * 3. Fetches the related entity data in small batches to respect API rate limits
 * 4. Saves progress periodically to games_partial.json
 *
 * ! RUN THIS BEFORE enrich_games.js !
 */

const axios = require("axios");
const fs = require("fs").promises;

const api_url = "https://api.igdb.com/v4";
const access_token = "fir5jpvzjibmfz9uo5tm9m9dwbfue1";
const client_id = "znsfyea6eb6di8exu84z0iczz5ncaj";

const endpoints = {
  games: {
    url: `${api_url}/games`,
    fields:
      "fields name,cover,first_release_date,game_modes,involved_companies,platforms,summary,total_rating,total_rating_count,genres;",
  },
  game_modes: {
    url: `${api_url}/game_modes`,
    fields: "fields name,slug;",
  },
  involved_companies: {
    url: `${api_url}/involved_companies`,
    fields: "fields company,developer,publisher;",
  },
  companies: {
    url: `${api_url}/companies`,
    fields: "fields name,slug,websites;",
  },
  companies_websites: {
    url: `${api_url}/company_websites`,
    fields: "fields url;",
  },
  platforms: {
    url: `${api_url}/platforms`,
    fields: "fields name,slug;",
  },
  genres: {
    url: `${api_url}/genres`,
    fields: "fields name,slug;",
  },
};

const limit = 500;

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetch_from_endpoint = async (endpoint, query) => {
  console.log(endpoint);

  try {
    const response = await axios.post(endpoint, query, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Client-ID": client_id,
        "Content-Type": "text/plain",
      },
    });

    await sleep(250);

    return response.data;
  } catch (error) {
    console.log("Error fetching from endpoint:", error);
    throw error;
  }
};

const fetch_entities = async (endpoint, ids) => {
  if (ids.size === 0) return [];

  // Convert Set to Array and chunk into smaller batches
  const idArray = Array.from(ids);
  const batchSize = 3; // Much smaller batch size
  const batches = [];

  for (let i = 0; i < idArray.length; i += batchSize) {
    const batch = idArray.slice(i, i + batchSize);
    batches.push(batch);
  }

  // Fetch each batch and combine results
  const results = [];
  for (const batch of batches) {
    try {
      console.log(
        `Fetching batch of ${batch.length} IDs for ${endpoint} (${batch.join(
          ","
        )})`
      );
      const query = `${endpoints[endpoint].fields} where id = (${batch.join(
        ","
      )});`;

      const response = await fetch_from_endpoint(
        endpoints[endpoint].url,
        query
      );
      results.push(...response);

      // Add an even longer delay between requests
      await sleep(1000); // 1 second delay
    } catch (error) {
      console.error(`Error with batch ${batch.join(",")}:`, error.message);
      continue; // Skip failed batch and continue with next one
    }
  }

  return results;
};

const fetch_related_data = async (games) => {
  const ids = {
    game_modes: new Set(),
    platforms: new Set(),
    genres: new Set(),
    involved_companies: new Set(),
    companies: new Set(),
    company_websites: new Set(),
  };

  console.log(games);

  games.forEach((game) => {
    if (game.game_modes)
      game.game_modes.forEach((id) => ids.game_modes.add(id));
    if (game.platforms) game.platforms.forEach((id) => ids.platforms.add(id));
    if (game.involved_companies)
      game.involved_companies.forEach((id) => ids.involved_companies.add(id));
    if (game.companies) game.companies.forEach((id) => ids.companies.add(id));
    if (game.company_websites)
      game.company_websites.forEach((id) => ids.company_websites.add(id));
  });

  const related_data = {
    game_modes: {},
    platforms: {},
    genres: {},
    involved_companies: {},
    companies: {},
    company_websites: {},
  };

  console.log("Fetching game modes...");
  const game_modes = await fetch_entities("game_modes", ids.game_modes);
  game_modes.forEach((mode) => (related_data.game_modes[mode.id] = mode));

  console.log("Fetching platfomrs...");
  const platforms = await fetch_entities("platforms", ids.platforms);
  platforms.forEach(
    (platform) => (related_data.platforms[platform.id] = platform)
  );

  console.log("Fetching genres...");
  const genres = await fetch_entities("genres", ids.genres);
  genres.forEach((genre) => (related_data.genres[genre.id] = genre));

  console.log("Fetching involved companies...");
  const involved_companies = await fetch_entities(
    "involved_companies",
    ids.involved_companies
  );
  involved_companies.forEach(
    (involved_company) =>
      (related_data.involved_companies[involved_company.id] = involved_company)
  );

  console.log("Fetching companies...");
  const companies = await fetch_entities("companies", ids.companies);
  companies.forEach(
    (company) => (related_data.companies[company.id] = company)
  );

  console.log("Fetching company websites...");
  const websites = await fetch_entities(
    "company_websites",
    ids.company_websites
  );
  websites.forEach(
    (website) => (related_data.company_websites[website.id] = website)
  );

  return related_data;
};

const enrich_games_data = async (games, relatedData) => {
  return games.map((game) => ({
    ...game,
    game_modes: game.game_modes?.map((id) => relatedData.game_modes[id]) || [],
    platforms: game.platforms?.map((id) => relatedData.platforms[id]) || [],
    genres: game.genres?.map((id) => relatedData.genres[id]) || [],
    involved_companies:
      game.involved_companies
        ?.map((id) => {
          const ic = relatedData.involved_companies[id];
          if (!ic) return null;

          const company = relatedData.companies[ic.company];
          return {
            ...ic,
            company: company
              ? {
                  ...company,
                  websites:
                    company.websites?.map(
                      (websiteId) => relatedData.company_websites[websiteId]
                    ) || [],
                }
              : null,
          };
        })
        .filter(Boolean) || [],
  }));
};

const validateGame = (game) => {
  const required = ["id", "name"];
  const missing = required.filter((field) => !game[field]);
  return missing.length === 0;
};

const fetch_data = async () => {
  const allGames = [];
  let offset = 0;
  let hasMoreData = true;

  try {
    while (hasMoreData) {
      console.log(`Fetching games batch at offset ${offset}...`);
      const games = await fetch_from_endpoint(
        endpoints.games.url,
        `${endpoints.games.fields} limit ${limit}; offset ${offset};`
      );

      allGames.push(...games);

      if (games.length < limit) hasMoreData = false;
      offset += limit;

      // Save progress periodically
      if (allGames.length % 10000 === 0) {
        await fs.writeFile(
          "games_partial.json",
          JSON.stringify(allGames, null, 2)
        );
        console.log(`Progress saved: ${allGames.length} games`);
      }
    }

    // Final save
    await fs.writeFile("games_partial.json", JSON.stringify(allGames, null, 2));
    console.log(
      `Successfully saved ${allGames.length} games to games_partial.json`
    );
  } catch (error) {
    console.error("Error: ", error);
  }
};

fetch_data();
