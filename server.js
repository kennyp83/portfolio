const express = require("express");
require('dotenv').config();
const https = require("https");
const Bottleneck = require("bottleneck");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = 3000;

// Riot API key must be set in environment variables
const RIOT_API_KEY = process.env.RIOT_API_KEY;
console.log(`Environment check - RIOT_API_KEY: ${RIOT_API_KEY ? RIOT_API_KEY.substring(0, 10) + '...' : 'NOT SET'}`);
if (!RIOT_API_KEY) {
  console.warn("Warning: RIOT_API_KEY is not set.");
}

// Force IPv4 for Riot API calls
const agent = new https.Agent({ family: 4 });

// Rate limiter for Riot API
// Riot limits: 20 requests per 1 second, 100 requests per 2 minutes
const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 100,  // 100ms between requests = 10 requests per second (well under the 20/sec limit)
  reservoir: 90, // Start with 90 requests available (under the 100/2min limit)
  reservoirRefreshAmount: 90,
  reservoirRefreshInterval: 2 * 60 * 1000, // Refresh every 2 minutes
});

app.use(express.static("public"));
app.use(express.json()); // parse JSON bodies

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Map server region codes to Riot's continent routing regions
const CONTINENT_MAP = {
  na1: "americas",
  br1: "americas",
  la1: "americas",
  la2: "americas",
  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",
  kr: "asia",
  jp1: "asia",
};

function getContinent(region) {
  return CONTINENT_MAP[region.toLowerCase()] || "americas";
}

// Fetch helper for Riot API with error handling (rate limiter temporarily disabled for testing)
async function riotFetch(url) {
  console.log(`Making request to: ${url}`);
  console.log(`Using API key: ${RIOT_API_KEY ? RIOT_API_KEY.substring(0, 10) + '...' : 'NO KEY'}`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY }, signal: controller.signal });
    clearTimeout(timeoutId);
    let raw = await res.text();
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch { /* keep raw */ }
    if (!res.ok) {
      const message = parsed?.status?.message || parsed?.message || parsed?.error || raw || res.statusText;
      console.error(`Riot API error ${res.status}: ${message}`);
      return { ok: false, status: res.status, error: message };
    }
    const data = parsed ?? (raw ? JSON.parse(raw) : {});
    return { ok: true, data };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`Request failed for ${url}: ${err.message}`);
    return { ok: false, status: err.name === 'AbortError' ? 408 : 500, error: err.message };
  }
}

// Get Riot account info by Riot ID
app.get("/account/:region/:gameName/:tagLine", async (req, res) => {
  const { region, gameName, tagLine } = req.params;
  const baseRegion = getContinent(region);
  console.log(`Account endpoint hit: ${region}/${gameName}/${tagLine} -> continent: ${baseRegion}`);
  const url = `https://${baseRegion}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  console.log(`Calling Riot API: ${url}`);
  const result = await riotFetch(url);
  console.log(`Riot API response:`, result.ok ? 'SUCCESS' : `FAILED (${result.status}): ${result.error}`);
  if (!result.ok) return res.status(result.status).json({ error: result.error, statusCode: result.status });
  res.json(result.data);
});

// Match-V5 routes - using region/continent interchangeably since frontend uses both
app.get("/matches/:regionOrContinent/:puuid", async (req, res) => {
  const { regionOrContinent, puuid } = req.params;
  const start = Number(req.query.start ?? 0);
  const count = Number(req.query.count ?? 10);
  
  // Accept both platform regions (na1, euw1) and continents (americas, europe)
  const cluster = (regionOrContinent || '').toLowerCase();
  const allowed = ["americas","europe","asia","sea"];
  const baseRegion = allowed.includes(cluster) ? cluster : getContinent(regionOrContinent);
  
  const url = `https://${baseRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;
  const result = await riotFetch(url);
  if (!result.ok) return res.status(result.status).json({ error: result.error, statusCode: result.status });
  res.json(result.data);
});

app.get("/match/:regionOrContinent/:matchId", async (req, res) => {
  const { regionOrContinent, matchId } = req.params;
  
  // Accept both platform regions (na1, euw1) and continents (americas, europe)
  const cluster = (regionOrContinent || '').toLowerCase();
  const allowed = ["americas","europe","asia","sea"];
  const baseRegion = allowed.includes(cluster) ? cluster : getContinent(regionOrContinent);
  
  const url = `https://${baseRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  const result = await riotFetch(url);
  if (!result.ok) return res.status(result.status).json({ error: result.error, statusCode: result.status });
  res.json(result.data);
});

// Get top 3 champion masteries for a player
app.get("/mastery/:region/:puuid", async (req, res) => {
  const { region, puuid } = req.params;

  const url = `https://${region}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`;
  const result = await riotFetch(url);
  if (!result.ok) return res.status(result.status).json({ error: result.error, statusCode: result.status });
  res.json(result.data.slice(0, 3));
});

// Get summoner info by PUUID
app.get("/summoner/:region/:puuid", async (req, res) => {
  const { region, puuid } = req.params;

  const url = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  const result = await riotFetch(url);
  console.log(`Summoner API result for ${region}:`, JSON.stringify(result, null, 2));
  if (!result.ok) return res.status(result.status).json({ error: result.error, statusCode: result.status });
  res.json(result.data);
});

// Get ranked stats by summoner ID
app.get("/ranked/:region/:summonerId", async (req, res) => {
  const { region, summonerId } = req.params;

  const url = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`;
  const result = await riotFetch(url);
  if (!result.ok) return res.status(result.status).json({ error: result.error, statusCode: result.status });
  res.json(result.data);
});

// Get top 20 challenger players in a region
app.get("/leaderboard/:region", async (req, res) => {
  const { region } = req.params;

  const url = `https://${region}.api.riotgames.com/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`;
  const result = await riotFetch(url);
  if (!result.ok) return res.status(result.status).json({ error: result.error });

  // Sort by league points and return top 20 baseline
  const baseline = result.data.entries
    .sort((a, b) => b.leaguePoints - a.leaguePoints)
    .slice(0, 20);

  // Ensure we have a summonerName; if missing, fetch it from Summoner-V4 by summonerId
  const enriched = await Promise.all(baseline.map(async (e) => {
    let name = e.summonerName;
    let gameName = undefined;
    let tagLine = undefined;
    try {
      const summUrl = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/${encodeURIComponent(e.summonerId)}`;
      const s = await riotFetch(summUrl);
      if (s.ok && s.data) {
        name = name || s.data.name;
        // Try to fetch Riot ID (gameName#tagLine) using puuid
        if (s.data.puuid) {
          const baseRegion = getContinent(region);
          const accUrl = `https://${baseRegion}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${encodeURIComponent(s.data.puuid)}`;
          const a = await riotFetch(accUrl);
          if (a.ok && a.data) {
            gameName = a.data.gameName;
            tagLine = a.data.tagLine;
          }
        }
      }
    } catch (_) { /* ignore */ }

    const totalGames = (e.wins || 0) + (e.losses || 0);
    const winRate = totalGames > 0 ? Math.round(((e.wins || 0) / totalGames) * 100) : 0;
    return {
      summonerId: e.summonerId,
      summonerName: (gameName || name || "Unknown"),
      gameName: gameName || name || "Unknown",
      tagLine: tagLine || null,
      leaguePoints: e.leaguePoints || 0,
      wins: e.wins || 0,
      losses: e.losses || 0,
      winRate
    };
  }));

  res.json(enriched);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
