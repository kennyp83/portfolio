// Configuration
const DDRAGON_VERSION = document.documentElement.style.getPropertyValue('--dd-version') || '15.9.1';

// ⭐ YOUR LEAGUE ACCOUNT - Change these to your own!
const MY_ACCOUNT = {
  gameName: '2011kiasoul',
  tagLine: 'ape',
  region: 'na1'
};

const REGIONS = {
  na1: "North America",
  euw1: "Europe West",
  eun1: "Europe Nordic & East",
  kr: "Korea",
  jp1: "Japan",
  br1: "Brazil",
  la1: "Latin America North",
  la2: "Latin America South",
  tr1: "Turkey",
  ru: "Russia"
};

const QUEUE_TYPES = {
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  430: "Normal Blind",
  440: "Ranked Flex",
  450: "ARAM",
  700: "Clash"
};

const ROLES = {
  TOP: { icon: "🛡️", name: "Top" },
  JUNGLE: { icon: "🌲", name: "Jungle" },
  MIDDLE: { icon: "⚔️", name: "Mid" },
  BOTTOM: { icon: "🎯", name: "ADC" },
  SUPPORT: { icon: "💫", name: "Support" }
};

// Known platform regions (used to brute force correct platform if user selected wrong one)
const PLATFORM_REGIONS = Object.keys(REGIONS);

// Region -> continent routing for Match-V5
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

// State Management
const state = {
  summoner: null,
  matches: [],
  matchDetails: [],
  championStats: {},
  roleStats: {},
  queueFilter: 'all',
  pageSize: 10,
  currentPage: 0
};

// Lightweight fetch wrapper (returns parsed JSON or throws with message)
async function fetchApi(endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${endpoint}?${qs}` : endpoint;
  const res = await fetch(url);
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text || '{}'); } catch { /* keep raw text */ }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function resolveAccount(gameName, tagLine, preferred) {
  const order = [preferred, ...PLATFORM_REGIONS.filter(r => r !== preferred)];
  for (const r of order) {
    try {
      const acc = await fetchApi(`/account/${r}/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      if (acc && acc.puuid) return { account: acc, region: r };
    } catch (e) { console.warn(`Account miss on ${r}: ${e.message}`); }
  }
  throw new Error('Summoner not found across all regions');
}

async function resolveSummoner(puuid, preferred) {
  const order = [preferred, ...PLATFORM_REGIONS.filter(r => r !== preferred)];
  for (const r of order) {
    try {
      const summ = await fetchApi(`/summoner/${r}/${encodeURIComponent(puuid)}`);
      // Accept summoner if it has PUUID (id field is optional - some legacy accounts don't have it)
      if (summ && summ.puuid) return { summoner: summ, region: r };
    } catch (e) { console.warn(`Summoner miss on ${r}: ${e.message}`); }
  }
  throw new Error('Could not retrieve summoner data (all regions failed)');
}

// Profile Loading
async function loadSummonerProfile() {
  const name = document.getElementById('name-input').value?.trim();
  const tag = document.getElementById('tag-input').value?.trim();
  const chosenRegion = document.getElementById('region-select').value;
  if (!name || !tag) { alert('Please enter both summoner name and tag'); return; }
  showLoading();
  try {
    // Reset state
    state.currentPage = 0; state.matches = []; state.matchDetails = [];
    const { account, region: accRegion } = await resolveAccount(name, tag, chosenRegion);
    const { summoner, region: platformRegion } = await resolveSummoner(account.puuid, accRegion);
    state.summoner = { ...summoner, ...account, region: platformRegion };
    const [ranked, mastery] = await Promise.all([
      // Skip ranked lookup if summoner.id is missing (legacy accounts)
      summoner.id ? fetchApi(`/ranked/${platformRegion}/${encodeURIComponent(summoner.id)}`).catch(() => []) : Promise.resolve([]),
      fetchApi(`/mastery/${platformRegion}/${encodeURIComponent(account.puuid)}`).catch(() => [])
    ]);
    renderProfile(account, summoner, ranked || []);
    if (Array.isArray(mastery) && mastery.length) renderChampionMastery(mastery);
    // Reveal profile sections now that we have a valid profile
    ['profile-card','recent-games-card','top-champs-card'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'block';
    });
    // Persist access state & show nav link
    localStorage.setItem('profileReady','true');
    const navLink = document.getElementById('nav-profile');
    if (navLink) navLink.style.display = '';
    loadMatches(); // async
    const url = new URL(window.location);
    url.searchParams.set('name', name);
    url.searchParams.set('tag', tag);
    url.searchParams.set('region', platformRegion);
    window.history.pushState({}, '', url);
  } catch (err) {
    console.error('Failed to load profile:', err);
    document.getElementById('matches-content').innerHTML = `<div class="muted" style="text-align:center;padding:2rem;color:#e04343">${err.message || 'Failed to load profile'}</div>`;
    const errorState = document.getElementById('error-state');
    if (errorState) errorState.style.display = 'block';
  } finally {
    hideLoading();
  }
}

function showLoading() { const el = document.getElementById('loading-spinner'); if (el) el.classList.remove('hidden'); }
function hideLoading() { const el = document.getElementById('loading-spinner'); if (el) el.classList.add('hidden'); }

async function loadMatches() {
  try {
    if (!state.summoner) return;
    const { region } = state.summoner;
  const continent = toContinent(region);
  const matchIds = await fetchApi(`/matches/${continent}/${state.summoner.puuid}`, {
      start: state.currentPage * state.pageSize,
      count: state.pageSize
    });

    // Fetch all match details in parallel with per-request error handling
    const detailPromises = matchIds.map(matchId => (
      fetchApi(`/match/${continent}/${matchId}`)
        .then(match => match)
        .catch(err => {
          console.warn('Failed to load match:', matchId, err.message);
          return null;
        })
    ));

    const details = await Promise.all(detailPromises);
    details.filter(Boolean).forEach(match => state.matchDetails.push(match));

    renderMatches();
    updatePerformanceStats();
    // Update recent match win/loss summary elements (non-visual structural change)
    const recentSlice = state.matchDetails.slice(-state.pageSize);
    let w = 0, l = 0;
    recentSlice.forEach(m => {
      const p = m.info.participants.find(pt => pt.puuid === state.summoner.puuid);
      if (p) p.win ? w++ : l++;
    });
    const rw = document.querySelector('.recent-wins'); if (rw) rw.textContent = `${w}W`;
    const rl = document.querySelector('.recent-losses'); if (rl) rl.textContent = `${l}L`;
    const rwr = document.querySelector('.recent-winrate'); if (rwr) rwr.textContent = (w + l ? `${Math.round((w/(w+l))*100)}%` : '0%');
  } catch (err) {
    console.error('Failed to load matches:', err);
  }
}

// Rendering Functions
function renderProfile(account, summoner, ranked) {
  // Update profile icon and name
  document.getElementById('summoner-icon').src = 
    `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${summoner.profileIconId}.png`;
  document.getElementById('summoner-name').textContent = `${account.gameName} #${account.tagLine}`;
  // Region mapping: use selected region from state since account.region is undefined from Riot API
  const regionName = REGIONS[state.summoner.region] || state.summoner.region;
  document.getElementById('summoner-meta').textContent = 
    `Level ${summoner.summonerLevel} • ${regionName}`;
  const lvlEl = document.getElementById('summoner-level');
  if (lvlEl) lvlEl.textContent = summoner.summonerLevel;
  
  // Ranked stats
  const soloQueue = ranked.find(q => q.queueType === 'RANKED_SOLO_5x5');
  const rankTier = document.getElementById('rank-tier');
  const rankLp = document.getElementById('rank-lp');
  const rankIcon = document.getElementById('rank-icon');
  
  if (soloQueue) {
    const { tier, rank, leaguePoints, wins, losses } = soloQueue;
    const games = wins + losses;
    const wr = games ? Math.round((wins / games) * 100) : 0;
    rankTier.textContent = `${tier} ${rank}`;
    rankLp.textContent = `${leaguePoints} LP • ${wr}% WR`;
    rankIcon.src = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/ranked-mini-crests/${tier.toLowerCase()}.svg`;
    const winsEl = document.getElementById('wins'); if (winsEl) winsEl.textContent = `${wins}W`;
    const lossesEl = document.getElementById('losses'); if (lossesEl) lossesEl.textContent = `${losses}L`;
    const wrEl = document.getElementById('win-rate'); if (wrEl) wrEl.textContent = `${wr}%`;
  } else {
    rankTier.textContent = 'Unranked';
    rankLp.textContent = 'No ranked games played';
    rankIcon.src = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/ranked-mini-crests/provisional.svg';
  }
}

function renderMatch(match) {
  const player = match.info.participants.find(p => p.puuid === state.summoner.puuid);
  if (!player) return null;
  
  const {
    championName, kills, deaths, assists,
    totalMinionsKilled, neutralMinionsKilled,
    win, individualPosition, teamPosition,
    visionScore, totalDamageDealtToChampions
  } = player;
  
  const kda = deaths === 0 ? 'Perfect' : ((kills + assists) / deaths).toFixed(1);
  const csPerMin = ((totalMinionsKilled + neutralMinionsKilled) / (match.info.gameDuration / 60)).toFixed(1);
  const position = individualPosition || teamPosition || 'Unknown';
  
  const matchDiv = document.createElement('div');
  matchDiv.className = `match ${win ? 'win' : 'loss'}`;
  
  matchDiv.innerHTML = `
    <div class="match-champion">
      <img class="champion-icon" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championName}.png" alt="${championName}">
      <div>
        <div>${championName}</div>
        <div class="match-type">${QUEUE_TYPES[match.info.queueId] || 'Custom'} • ${position}</div>
      </div>
    </div>
    
    <div class="match-details">
      <div class="kda">${kills} / ${deaths} / ${assists} <span class="muted">(${kda} KDA)</span></div>
      <div class="cs">${totalMinionsKilled + neutralMinionsKilled} CS (${csPerMin}/min) • VS ${visionScore}</div>
    </div>
    
    <div class="match-stats">
      <div>${new Intl.NumberFormat().format(totalDamageDealtToChampions)} damage</div>
      <div class="muted">${new Intl.RelativeTimeFormat('en').format(
        Math.ceil((match.info.gameEndTimestamp - new Date()) / (1000 * 60 * 60 * 24)), 'day')}</div>
    </div>
  `;
  
  return matchDiv;
}

function renderChampionMastery(masteryData) {
  const championsGrid = document.getElementById('champions-grid');
  if (!championsGrid) return;
  
  championsGrid.innerHTML = '';
  
  masteryData.slice(0, 6).forEach((mastery, index) => {
    const masteryItem = document.createElement('div');
    masteryItem.className = 'champion-mastery-item';
    
    masteryItem.innerHTML = `
      <img class="champion-icon" src="https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${getChampionNameById(mastery.championId)}.png" alt="Champion">
      <div class="mastery-info">
        <h4>${getChampionNameById(mastery.championId)}</h4>
        <div class="mastery-level">Level ${mastery.championLevel}</div>
        <div class="mastery-points">${mastery.championPoints.toLocaleString()} pts</div>
      </div>
      <div class="mastery-rank">#${index + 1}</div>
    `;
    
    championsGrid.appendChild(masteryItem);
  });
}

function getChampionNameById(championId) {
  // This is a simplified mapping - in a real app you'd want to load the full champion data
  const championMap = {
    1: "Annie", 2: "Olaf", 3: "Galio", 4: "TwistedFate", 5: "XinZhao",
    6: "Urgot", 7: "LeBlanc", 8: "Vladimir", 9: "Fiddlesticks", 10: "Kayle",
    11: "MasterYi", 12: "Alistar", 13: "Ryze", 14: "Sion", 15: "Sivir",
    16: "Soraka", 17: "Teemo", 18: "Tristana", 19: "Warwick", 20: "Nunu",
    21: "MissFortune", 22: "Ashe", 23: "Tryndamere", 24: "Jax", 25: "Morgana",
    26: "Zilean", 27: "Singed", 28: "Evelynn", 29: "Twitch", 30: "Karthus",
    31: "Chogath", 32: "Amumu", 33: "Rammus", 34: "Anivia", 35: "Shaco",
    36: "DrMundo", 37: "Sona", 38: "Kassadin", 39: "Irelia", 40: "Janna",
    41: "Gangplank", 42: "Corki", 43: "Karma", 44: "Taric", 45: "Veigar",
    48: "Trundle", 50: "Swain", 51: "Caitlyn", 53: "Blitzcrank", 54: "Malphite",
    55: "Katarina", 56: "Nocturne", 57: "Maokai", 58: "Renekton", 59: "JarvanIV",
    60: "Elise", 61: "Orianna", 62: "Wukong", 63: "Brand", 64: "LeeSin",
    67: "Vayne", 68: "Rumble", 69: "Cassiopeia", 72: "Skarner", 74: "Heimerdinger",
    75: "Nasus", 76: "Nidalee", 77: "Udyr", 78: "Poppy", 79: "Gragas",
    80: "Pantheon", 81: "Ezreal", 82: "Mordekaiser", 83: "Yorick", 84: "Akali",
    85: "Kennen", 86: "Garen", 89: "Leona", 90: "Malzahar", 91: "Talon",
    92: "Riven", 96: "KogMaw", 98: "Shen", 99: "Lux", 101: "Xerath",
    102: "Shyvana", 103: "Ahri", 104: "Graves", 105: "Fizz", 106: "Volibear",
    107: "Rengar", 110: "Varus", 111: "Nautilus", 112: "Viktor", 113: "Sejuani",
    114: "Fiora", 115: "Ziggs", 117: "Lulu", 119: "Draven", 120: "Hecarim",
    121: "Khazix", 122: "Darius", 126: "Jayce", 127: "Lissandra", 131: "Diana",
    133: "Quinn", 134: "Syndra", 136: "AurelionSol", 141: "Kayn", 142: "Azir",
    143: "Zyra", 145: "Kaisa", 147: "Seraphine", 150: "Gnar", 154: "Zac",
    157: "Yasuo", 161: "Velkoz", 163: "Taliyah", 164: "Camille", 166: "Akshan",
    200: "Belveth", 201: "Braum", 202: "Jhin", 203: "Kindred", 221: "Zeri",
    222: "Jinx", 223: "TahmKench", 234: "Viego", 235: "Senna", 236: "Lucian",
    238: "Zed", 240: "Kled", 245: "Ekko", 246: "Qiyana", 254: "Vi",
    266: "Aatrox", 267: "Nami", 268: "Azir", 350: "Yuumi", 360: "Samira",
    412: "Thresh", 420: "Illaoi", 421: "RekSai", 427: "Ivern", 429: "Kalista",
    432: "Bard", 516: "Ornn", 517: "Sylas", 518: "Neeko", 523: "Aphelios",
    526: "Rell", 555: "Pyke", 711: "Vex", 777: "Yone", 875: "Sett",
    876: "Lillia", 887: "Gwen", 888: "Renata", 895: "Nilah", 897: "KSante",
    901: "Smolder", 902: "Ambessa", 910: "Hwei", 950: "Naafiri"
  };
  
  return championMap[championId] || `Champion${championId}`;
}

function renderMatches() {
  const matchesContent = document.getElementById('matches-content');
  const filteredMatches = state.matchDetails.filter(match => {
    if (state.queueFilter === 'all') return true;
    const queueType = QUEUE_TYPES[match.info.queueId]?.toLowerCase() || '';
    return queueType.includes(state.queueFilter);
  });
  
  if (state.currentPage === 0) {
    matchesContent.innerHTML = '';
  }
  
  filteredMatches.forEach(match => {
    const matchElement = renderMatch(match);
    if (matchElement) {
      matchesContent.appendChild(matchElement);
    }
  });
  
  const loadMore = document.getElementById('load-more');
  loadMore.style.display = state.matchDetails.length >= state.pageSize ? 'block' : 'none';
}

function updatePerformanceStats() {
  if (!state.matchDetails.length) return;
  
  const stats = state.matchDetails.reduce((acc, match) => {
    const player = match.info.participants.find(p => p.puuid === state.summoner.puuid);
    if (!player) return acc;
    
    acc.kills += player.kills;
    acc.deaths += player.deaths;
    acc.assists += player.assists;
    acc.cs += player.totalMinionsKilled + player.neutralMinionsKilled;
    acc.duration += match.info.gameDuration;
    if (player.win) acc.wins++;
    
    const role = player.individualPosition || player.teamPosition;
    if (role && role !== 'NONE') {
      acc.roles[role] = (acc.roles[role] || 0) + 1;
    }
    
    return acc;
  }, {
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    duration: 0,
    wins: 0,
    roles: {}
  });
  
  const games = state.matchDetails.length;
  const avgKda = stats.deaths ? ((stats.kills + stats.assists) / stats.deaths).toFixed(2) : 'Perfect';
  const winRate = ((stats.wins / games) * 100).toFixed(1);
  const csPerMin = ((stats.cs / (stats.duration / 60))).toFixed(1);
  
  document.getElementById('avg-kda').textContent = avgKda;
  document.getElementById('win-rate').textContent = `${winRate}%`;
  document.getElementById('avg-cs').textContent = csPerMin;
  
  // Role distribution
  const roleStats = Object.entries(stats.roles)
    .map(([role, count]) => ({
      role,
      count,
      percentage: (count / games) * 100
    }))
    .sort((a, b) => b.count - a.count);
  
  document.getElementById('role-stats').innerHTML = roleStats
    .slice(0, 3)
    .map(({ role, percentage }) => `
      <div class="role-stat">
        <div>${ROLES[role]?.icon || '❓'}</div>
        <div>${Math.round(percentage)}%</div>
      </div>
    `)
    .join('');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Ensure loading spinner hidden until an explicit load starts
  hideLoading();

  // Search button (may not exist on profile page)
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) searchBtn.addEventListener('click', loadSummonerProfile);
  
  // Enter key in search fields
  ['name-input', 'tag-input'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        loadSummonerProfile();
      }
    });
  });
  
  // Queue filter
  const queueFilterEl = document.getElementById('queue-filter');
  if (queueFilterEl) {
    queueFilterEl.addEventListener('change', () => {
      state.queueFilter = queueFilterEl.value;
      renderMatches();
    });
  }
  
  // Load more button
  const loadMoreBtn = document.getElementById('load-more');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      state.currentPage++;
      loadMatches();
    });
  }
  
  // Check URL params or auto-load your account
  const params = new URLSearchParams(window.location.search);
  const name = params.get('name');
  const tag = params.get('tag');
  const region = params.get('region');
  
  // Auto-load logic
  if (name && tag) {
    // Load from URL params
    document.getElementById('name-input').value = name;
    document.getElementById('tag-input').value = tag;
    if (region && document.getElementById('region-select').querySelector(`option[value="${region}"]`)) {
      document.getElementById('region-select').value = region;
    }
    setTimeout(loadSummonerProfile, 100);
  } else {
    // Auto-load YOUR account on page load
    document.getElementById('name-input').value = MY_ACCOUNT.gameName;
    document.getElementById('tag-input').value = MY_ACCOUNT.tagLine;
    document.getElementById('region-select').value = MY_ACCOUNT.region;
    setTimeout(loadSummonerProfile, 500); // Small delay for smooth animation
  }
});
