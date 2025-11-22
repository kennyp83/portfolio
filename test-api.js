const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

async function testAPI() {
  const apiKey = process.env.RIOT_API_KEY;
  console.log(`Testing API key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
  
  const url = 'https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/2011kiasoul/ape';
  console.log(`Testing URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-Riot-Token': apiKey
      }
    });
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers));
    
    const text = await response.text();
    console.log(`Response body: ${text}`);
    
    if (response.ok) {
      console.log('✅ API key is working!');
    } else {
      console.log('❌ API key failed');
    }
  } catch (error) {
    console.error('Network error:', error.message);
  }
}

testAPI();
