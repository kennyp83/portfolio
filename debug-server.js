const express = require("express");
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = 3001;

const RIOT_API_KEY = process.env.RIOT_API_KEY;
console.log(`DEBUG - API Key loaded: ${RIOT_API_KEY ? RIOT_API_KEY.substring(0, 15) + '...' : 'NOT LOADED'}`);

app.use(express.static("public"));

// Simple test endpoint
app.get("/test", (req, res) => {
  res.json({ 
    message: "Server is working",
    apiKeyLoaded: !!RIOT_API_KEY,
    apiKeyPrefix: RIOT_API_KEY ? RIOT_API_KEY.substring(0, 10) : null
  });
});

// Test API call endpoint
app.get("/test-riot-api", async (req, res) => {
  console.log("Test endpoint hit");
  console.log(`API Key: ${RIOT_API_KEY ? RIOT_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
  
  try {
    const url = 'https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/2011kiasoul/ape';
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': RIOT_API_KEY
      }
    });
    
    console.log(`Response status: ${response.status}`);
    const text = await response.text();
    console.log(`Response body: ${text}`);
    
    if (response.ok) {
      res.json({ success: true, data: JSON.parse(text) });
    } else {
      res.status(response.status).json({ error: text });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Debug server running at http://localhost:${PORT}`);
});
