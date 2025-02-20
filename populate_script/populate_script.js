const axios = require("axios");
const fs = require("fs").promises;

const API_URL = "https://api.igdb.com/v4/games";
const ACCESS_TOKEN = "fir5jpvzjibmfz9uo5tm9m9dwbfue1";
const CLIENT_ID = "znsfyea6eb6di8exu84z0iczz5ncaj";

const FIELDS =
  "fields name,cover,first_release_date,game_modes,involved_companies,platforms,summary,total_rating,total_rating_count;";

const LIMIT = 500;

const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchData = async () => {
  const allGames = [];
  let offset = 0;
  let hasMoreData = true;
  try {
    while (hasMoreData) {
      const result = await axios.post(
        API_URL,
        `${FIELDS} limit ${LIMIT}; offset ${offset};`,
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            "Client-ID": CLIENT_ID,
            "Content-Type": "text/plain",
          },
        }
      );
      const games = result.data;
      allGames.push(...games);

      if (allGames.length % 10000 === 0) {
        await fs.writeFile("games.json", JSON.stringify(allGames, null, 2));
        console.log(`Progress saved: ${allGames.length} games`);
      }

      if (games.length < LIMIT) {
        hasMoreData = false;
        await fs.writeFile("games.json", JSON.stringify(allGames, null, 2));
        console.log(`Completed! Total games saved: ${allGames.length}`);
      }

      offset += LIMIT;

      await sleep(250);
    }

    await fs.writeFile("games.json", JSON.stringify(allGames, null, 2));
    console.log(`Successfully saved ${allGames.length} games to games.json`);
  } catch (error) {
    console.log("Error: ", error);
    if (allGames.length > 0 && allGames.length % 10000 !== 0) {
      await fs.writeFile(
        "games_partial.json",
        JSON.stringify(allGames, null, 2)
      );
      console.log(
        `Saved partial data (${allGames.length} games) to games_partial.json`
      );
    }
  }
};

fetchData();
