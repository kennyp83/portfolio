// public/script.js
// Clean rebuild: fixed architecture, removed duplicates, proper braces, preserved UI IDs/classes.
// Profile logic primarily lives in profile.js; this file offers a lightweight standalone loader
// (search -> fetch account/summoner/ranked/mastery/matches) for pages that include these IDs.

// =========================
// Configuration & Constants
// =========================
const DDRAGON_VERSION = "15.9.1";
const REGION_CANDIDATES = [
  "na1","euw1","eun1","kr","jp1","br1","la1","la2","tr1","ru"
];

// Champion data keyed by numeric champion key (stringified number from Data Dragon JSON)
let champDataMap = {}; // { [championKey]: { id, name, key } }

// =========================
// Utility Helpers
// =========================
const $ = (sel) => document.querySelector(sel);

function create(tag, attrs = {}, text = "") {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") {
      el.className = attrs[k];
    } else if (k === "style") {
      el.setAttribute("style", attrs[k]);
    } else {
      el.setAttribute(k, attrs[k]);
    }
  }
  if (text) el.textContent = text;
  return el;
}

function showLoading() {
  const spinner = $("#loading-spinner");
  if (spinner) spinner.classList.remove("hidden");
}

function hideLoading() {
  const spinner = $("#loading-spinner");
  if (spinner) spinner.classList.add("hidden");
}

async function fetchApi(endpoint) {
  const res = await fetch(endpoint);
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!res.ok) {
    const msg = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function safeJson(res) {
  try { return await res.json(); } catch { return null; }
}

async function safeReadError(res) {
  try {
    const json = await res.json();
    return json?.error || JSON.stringify(json);
  } catch {
    try { return await res.text(); } catch { return `${res.status} ${res.statusText}`; }
  }
}

// =========================
// Region -> Continent (Match-V5 only)
// =========================
function toContinent(region) {
  const map = {
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
    oc1: "sea",
    ph2: "sea",
    sg2: "sea",
    th2: "sea",
    tw2: "sea",
    vn2: "sea"
  };
  return map[region] || "americas";
}

// =========================
// Data Loading Functions
// =========================
async function loadChampionData() {
  try {
    const url = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/champion.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load champion list ${res.status}`);
    const json = await res.json();
    const data = json?.data || {};
    champDataMap = {};
    for (const key in data) {
      const c = data[key]; // { key: "266", id: "Aatrox", name: "Aatrox" }
      champDataMap[c.key] = { id: c.id, name: c.name, key: c.key };
    }
  } catch (err) {
    console.error("Champion data load failed", err);
    champDataMap = {};
  }
}

async function findAccountRegion(gameName, tagLine, preferredRegion) {
  // Try preferred region first (selected from dropdown) then brute force candidates.
  const ordered = preferredRegion && REGION_CANDIDATES.includes(preferredRegion)
    ? [preferredRegion, ...REGION_CANDIDATES.filter(r => r !== preferredRegion)]
    : [...REGION_CANDIDATES];
  for (const region of ordered) {
    try {
      const data = await fetchApi(`/account/${region}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      if (data && data.puuid) return { ...data, region };
    } catch (err) {
      // Swallow and continue
    }
  }
  return null;
}

async function loadMatches(region, puuid, limit = 10) {
  const continent = toContinent(region);
  const matchIds = await fetchApi(`/matches/${continent}/${encodeURIComponent(puuid)}?start=0&count=${limit}`);
  if (!Array.isArray(matchIds)) return [];
  const results = [];
  for (const matchId of matchIds) {
    try {
      const match = await fetchApi(`/match/${continent}/${encodeURIComponent(matchId)}`);
      match.puuid = puuid; // Track the requesting player
      results.push(match);
    } catch (err) {
      // Skip failed match
    }
  }
  return results;
}

// =========================
// Rendering Functions
// =========================
function renderProfileHeader(container, account, summoner, rankedArray) {
  if (!container) return;
  container.innerHTML = "";
  const header = create("div", { class: "profile-header" });
  const profileIcon = create("img", {
    src: `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${summoner.profileIconId}.png`,
    alt: "Profile Icon"
  });
  header.appendChild(profileIcon);

  const info = create("div");
  info.appendChild(create("div", { class: "profile-meta" }, `${account.gameName} #${account.tagLine}`));
  info.appendChild(create("div", { class: "profile-meta" }, `Level ${summoner.summonerLevel}`));
  info.appendChild(create("div", { class: "profile-meta" }, `Region: ${account.region || "unknown"}`));
  header.appendChild(info);

  // Basic ranked summary if available
  const solo = Array.isArray(rankedArray) ? rankedArray.find(r => r.queueType === "RANKED_SOLO_5x5") : null;
  if (solo) {
    const rankedDiv = create("div", { class: "profile-meta" }, `${solo.tier} ${solo.rank} • ${solo.leaguePoints} LP`);
    info.appendChild(rankedDiv);
  }

  container.appendChild(header);
}

function renderTopChamps(container, mastery) {
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(mastery) || mastery.length === 0) {
    container.textContent = "No mastery data.";
    return;
  }
  mastery.slice(0, 3).forEach(m => {
    const champInfo = champDataMap[m.championId?.toString()] || Object.values(champDataMap).find(c => c.id === m.championId);
    const champName = champInfo ? champInfo.id : m.championId;
    const item = create("div", { class: "champion-mastery-item" });
    const img = create("img", {
      class: "champion-icon",
      src: `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${champName}.png`,
      alt: champName
    });
    const info = create("div", { class: "mastery-info" });
    info.appendChild(create("h4", {}, champName));
    info.appendChild(create("div", { class: "mastery-points" }, `${m.championPoints.toLocaleString()} pts`));
    item.appendChild(img);
    item.appendChild(info);
    container.appendChild(item);
  });
}

function renderRecentMatches(container, matches) {
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(matches) || matches.length === 0) {
    container.textContent = "No recent matches.";
    return;
  }
  matches.forEach(match => {
    const player = match.info?.participants?.find(p => p.puuid === match.puuid);
    if (!player) return;
    const div = create("div", { class: "match-item" });
    const winLoss = player.win ? "win" : "loss";
    div.classList.add(winLoss);
    const champName = player.championName;
    const kda = `${player.kills}/${player.deaths}/${player.assists}`;
    const durationMins = ((match.info.gameDuration || 0) / 60).toFixed(0);
    div.innerHTML = `
      <div class="match-result ${winLoss}">${player.win ? "Victory" : "Defeat"}</div>
      <div class="champion-info">
        <img class="champion-icon" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${champName}.png" alt="${champName}" />
        <div class="match-details">
          <div class="match-kda">KDA: ${kda}</div>
          <div class="match-duration">${durationMins}m • ${player.totalMinionsKilled + player.neutralMinionsKilled} CS</div>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// =========================
// Main Loader (Search -> Profile Data)
// =========================
async function loadProfile() {
  const gameNameInput = $("#game-name");
  const tagLineInput = $("#tag-line");
  const regionSelect = $("#region-select");
  if (!gameNameInput || !tagLineInput || !regionSelect) {
    console.warn("Required inputs not found on page.");
    return;
  }
  const gameName = gameNameInput.value.trim();
  const tagLine = tagLineInput.value.trim();
  const region = regionSelect.value;
  if (!gameName || !tagLine) {
    alert("Please enter both Summoner Name and Tag Line.");
    return;
  }

  showLoading();
  const profileDataEl = $("#profile-data");
  const recentCard = $("#recent-games-card");
  const champsCard = $("#top-champs-card");
  const resultsEl = $("#results");
  const topChampsEl = $("#top-champs");

  try {
    // Resolve account region (brute force if needed)
    let account = await findAccountRegion(gameName, tagLine, region);
    if (!account) throw new Error("Summoner not found across regions.");

    // Summoner core data
    const summRes = await fetch(`/summoner/${account.region}/${encodeURIComponent(account.puuid)}`);
    if (!summRes.ok) throw new Error(await safeReadError(summRes));
    const summoner = await safeJson(summRes);
    if (!summoner || !summoner.id) throw new Error("Failed to retrieve summoner details.");

    // Ranked & Mastery (parallel)
    const [rankedRes, masteryRes] = await Promise.all([
      fetch(`/ranked/${account.region}/${encodeURIComponent(summoner.id)}`),
      fetch(`/mastery/${account.region}/${encodeURIComponent(account.puuid)}`)
    ]);
    const ranked = rankedRes.ok ? await safeJson(rankedRes) : [];
    const mastery = masteryRes.ok ? await safeJson(masteryRes) : [];

    // Matches (continent routing)
    const matches = await loadMatches(account.region, account.puuid, 10);

    // Render
    renderProfileHeader(profileDataEl, account, summoner, ranked || []);
    renderTopChamps(topChampsEl, mastery || []);
    renderRecentMatches(resultsEl, matches || []);

    if (recentCard) recentCard.style.display = "";
    if (champsCard) champsCard.style.display = "";
  } catch (err) {
    console.error(err);
    if (profileDataEl) {
      profileDataEl.innerHTML = `<div style='color:#e04343;text-align:center'>${err.message || "Failed to load profile."}</div>`;
    }
    if (recentCard) recentCard.style.display = "none";
    if (champsCard) champsCard.style.display = "none";
  } finally {
    hideLoading();
  }
}

// =========================
// Event Wiring (Single DOMContentLoaded)
// =========================
document.addEventListener("DOMContentLoaded", () => {
  loadChampionData();

  const searchBtn = $("#search-btn");
  if (searchBtn) searchBtn.addEventListener("click", loadProfile);

  ["#game-name", "#tag-line"].forEach(sel => {
    const el = $(sel);
    if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") loadProfile(); });
  });

  // Debug button (NOT inside loadProfile) – optional quick test
  if (!document.getElementById("debug-btn")) {
    const btn = document.createElement("button");
    btn.id = "debug-btn";
    btn.textContent = "Test Faker (KR/GOD)";
    btn.style = "position:fixed;bottom:24px;right:24px;z-index:9999;padding:1rem 2rem;background:#ff3ca6;color:#fff;border-radius:12px;font-size:1.2rem;box-shadow:0 0 20px #ff3ca6;cursor:pointer;";
    btn.onclick = () => {
      const nameEl = $("#game-name");
      const tagEl = $("#tag-line");
      const regionEl = $("#region-select");
      if (nameEl && tagEl && regionEl) {
        nameEl.value = "Hide on bush"; // Example
        tagEl.value = "KR1"; // Placeholder tag line
        regionEl.value = "kr";
        loadProfile();
      }
    };
    document.body.appendChild(btn);
  }
});