# Kenny's Portfolio & League Stats Tracker

A modern personal portfolio showcasing coding projects and League of Legends statistics, built with Node.js and the Riot Games API.

![Portfolio Preview](https://img.shields.io/badge/status-live-success)
![License](https://img.shields.io/badge/license-MIT-blue)

## 🚀 Features

- **Personal Portfolio**: Showcase coding projects and technical skills
- **League of Legends Stats**: Real-time summoner profile, match history, and champion mastery
- **Champion Meta Rankings**: Live tier rankings and champion statistics by role
- **Auto-loading Profile**: Automatically displays configured League account stats
- **Responsive Design**: Fully responsive layout that works on desktop and mobile
- **Modern UI**: Clean, professional design with smooth animations and transitions
- **Auto-hiding Navbar**: Smart navigation that hides on scroll for better reading experience

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **API**: Riot Games API (Account-V1, Summoner-V4, Match-V5, Champion Mastery-V4)
- **Styling**: Custom CSS with modern design system (Inter & JetBrains Mono fonts)
- **Rate Limiting**: Bottleneck.js for API request management

## 📦 Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/league-match-tracker.git
cd league-match-tracker
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create a `.env` file:**
```bash
cp .env.example .env
```

4. **Add your Riot API key to `.env`:**
```env
RIOT_API_KEY=your_riot_api_key_here
```

Get your API key from: https://developer.riotgames.com/

5. **Start the server:**
```bash
npm start
```

6. **Open your browser to:**
```
http://localhost:3000
```

## 🎮 Configuration

To display your own League profile automatically, edit `public/profile.js`:

```javascript
const MY_ACCOUNT = {
  gameName: '2011kiasoul',  // Your Riot ID
  tagLine: 'ape',           // Your tagline
  region: 'na1'             // Your region (na1, euw1, kr, etc.)
};
```

## 📁 Project Structure

```
league-match-tracker/
├── public/
│   ├── index.html          # Homepage/landing page
│   ├── projects.html       # Projects showcase
│   ├── profile.html        # League stats page
│   ├── champion-ranks.html # Champion meta rankings
│   ├── profile.js          # Profile page logic
│   ├── script.js           # Main JavaScript
│   ├── enhancements.js     # UI enhancements (animations, effects)
│   └── styles/
│       └── main.css        # All styling
├── server.js               # Express server & API routes
├── debug-server.js         # Debug version with logging
├── test-api.js             # API testing utilities
├── package.json
├── .env.example            # Environment variables template
├── .gitignore
└── README.md
```

## 🔑 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `RIOT_API_KEY` | Your Riot Games API key | Yes | - |
| `PORT` | Server port | No | 3000 |

## 📝 API Endpoints

### Account & Summoner
- `GET /account/:region/:gameName/:tagLine` - Get account by Riot ID
- `GET /summoner/:region/:puuid` - Get summoner info by PUUID

### Stats & Rankings
- `GET /ranked/:region/:summonerId` - Get ranked stats
- `GET /mastery/:region/:puuid` - Get champion mastery (top 5)

### Matches
- `GET /matches/:continent/:puuid?start=0&count=20` - Get match history
- `GET /match/:continent/:matchId` - Get detailed match info

### Regions
- **Americas**: na1, br1, la1, la2
- **Europe**: euw1, eun1, tr1, ru
- **Asia**: kr, jp1

## 🎨 Features & Easter Eggs

- **Konami Code**: Type ↑↑↓↓←→←→BA for a colorful surprise! 🌈
- **Smooth Animations**: Confetti celebrations and smooth page transitions
- **Auto-hiding Navbar**: Navbar intelligently hides when scrolling down, shows when scrolling up
- **Professional Design**: Modern color system with blue/purple accents
- **Responsive Layout**: Mobile-first design that adapts to all screen sizes

## 🚀 Usage

### View Your League Stats
1. Navigate to the "League" tab in the navigation
2. Your configured account stats will load automatically
3. View match history, champion mastery, and rank information

### Browse Champion Meta
1. Click "League" → Navigate to Champion Rankings
2. Filter champions by role (Top, Jungle, Mid, ADC, Support)
3. View win rates, pick rates, and ban rates

### Explore Projects
1. Click "Work" in the navigation
2. Browse featured projects and skills
3. View live demos and source code

## 🔧 Development

### Run in development mode:
```bash
npm start
```

### Run debug server with detailed logging:
```bash
node debug-server.js
```

### Test API endpoints:
```bash
node test-api.js
```

## 📊 API Rate Limiting

The application uses Bottleneck.js to manage Riot API rate limits:
- **Development Keys**: 20 requests per second, 100 requests per 2 minutes
- Automatic request queuing and retry logic
- Graceful error handling

## 🐛 Troubleshooting

### "Failed to load profile data"
- Check that your Riot API key is valid and not expired
- Verify the summoner name and region are correct
- Ensure your API key has not exceeded rate limits

### Port already in use
- Change the PORT in `.env` to a different port (e.g., 3001)
- Or kill the process using port 3000

### API Key Issues
- Development keys expire every 24 hours - regenerate at https://developer.riotgames.com/
- Make sure `.env` is in the project root directory
- Restart the server after changing the API key

## 🎯 Future Projects

Building expertise in low-level systems programming:

- **🖥️ Operating System**: Custom OS kernel with process scheduling, memory management, and file systems
- **🌐 Network Stack**: TCP/IP implementation from scratch with packet routing and protocol handling
- **⚙️ Physics Engine**: Real-time physics simulation with collision detection and rigid body dynamics
- **💻 Emulator/VM**: Virtual machine with CPU emulation, instruction set architecture, and memory virtualization

## 📄 License

MIT License - feel free to use this project for your own portfolio!

Copyright (c) 2025 Kenny

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 🙏 Acknowledgments

- **Riot Games** for the comprehensive League of Legends API
- **Data Dragon** for champion assets and icons
- **Community Feedback** for design improvements and feature suggestions

## 📧 Contact

- **Portfolio**: [Your Portfolio URL]
- **GitHub**: [@yourusername](https://github.com/yourusername)
- **Email**: your.email@example.com

---

**Built with ❤️ and lots of coffee** ☕
