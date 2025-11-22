// ============================================
// LEAGUE STATS - ENHANCEMENT LAYER
// Adds magical effects, sounds, and Easter eggs
// ============================================

// Configuration
const CONFIG = {
  enableCursorTrail: true,
  enableConfetti: true,
  enableEasterEggs: true,
  particleCount: 40
};

// ============================================
// AUTO-HIDE NAVBAR ON SCROLL
// ============================================
let lastScrollTop = 0;
let scrollTimeout;
const navbar = document.querySelector('nav');
const scrollThreshold = 50; // pixels scrolled before hiding

function handleNavbarScroll() {
  const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
  
  // Clear existing timeout
  clearTimeout(scrollTimeout);
  
  if (currentScroll > lastScrollTop && currentScroll > scrollThreshold) {
    // Scrolling down & past threshold
    navbar.style.transform = 'translateY(-100%)';
  } else {
    // Scrolling up or at top
    navbar.style.transform = 'translateY(0)';
  }
  
  lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
  
  // Add a slight delay before showing navbar when user stops scrolling
  scrollTimeout = setTimeout(() => {
    if (currentScroll > scrollThreshold) {
      navbar.style.transform = 'translateY(0)';
    }
  }, 150);
}

window.addEventListener('scroll', handleNavbarScroll, { passive: true });

// ============================================
// CURSOR TRAIL EFFECT
// ============================================
let lastTrailTime = 0;
const TRAIL_INTERVAL = 30; // ms between trail particles

function createCursorTrail(e) {
  if (!CONFIG.enableCursorTrail) return;
  
  const now = Date.now();
  if (now - lastTrailTime < TRAIL_INTERVAL) return;
  lastTrailTime = now;
  
  const trail = document.createElement('div');
  trail.className = 'cursor-trail';
  trail.style.left = e.pageX + 'px';
  trail.style.top = e.pageY + 'px';
  
  // Random color variation
  const colors = ['#c89b3c', '#cdbe91', '#f0e6d2', '#9d4edd', '#ff6b35'];
  trail.style.background = colors[Math.floor(Math.random() * colors.length)];
  
  document.body.appendChild(trail);
  
  setTimeout(() => trail.remove(), 500);
}

// ============================================
// CONFETTI SYSTEM
// ============================================
function createConfetti(x, y, count = 30) {
  if (!CONFIG.enableConfetti) return;
  
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.cssText = `
        position: fixed;
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        background: ${['#c89b3c', '#cdbe91', '#f0e6d2', '#9d4edd', '#ff6b35'][Math.floor(Math.random() * 5)]};
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
        z-index: 10000;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        opacity: 1;
        transform: rotate(${Math.random() * 360}deg);
      `;
      
      document.body.appendChild(confetti);
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * 5 + 3;
      const gravity = 0.3;
      const rotationSpeed = Math.random() * 10 - 5;
      
      let vx = Math.cos(angle) * velocity;
      let vy = Math.sin(angle) * velocity - 5;
      let rotation = 0;
      let posX = x;
      let posY = y;
      let opacity = 1;
      
      function animate() {
        vy += gravity;
        posX += vx;
        posY += vy;
        rotation += rotationSpeed;
        opacity -= 0.01;
        
        confetti.style.left = posX + 'px';
        confetti.style.top = posY + 'px';
        confetti.style.transform = `rotate(${rotation}deg)`;
        confetti.style.opacity = opacity;
        
        if (opacity > 0 && posY < window.innerHeight + 100) {
          requestAnimationFrame(animate);
        } else {
          confetti.remove();
        }
      }
      
      animate();
    }, i * 20);
  }
}

// Sound effects removed per user request

// ============================================
// EASTER EGGS
// ============================================
let konamiCode = [];
const KONAMI = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // Up Up Down Down Left Right Left Right B A

function checkKonamiCode(e) {
  konamiCode.push(e.keyCode);
  konamiCode = konamiCode.slice(-10);
  
  if (konamiCode.join(',') === KONAMI.join(',')) {
    activateGodMode();
  }
}

function activateGodMode() {
  createConfetti(window.innerWidth / 2, window.innerHeight / 2, 100);
  
  const msg = document.createElement('div');
  msg.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Orbitron', monospace;
    font-size: 3rem;
    font-weight: 900;
    color: #c89b3c;
    text-shadow: 0 0 20px #c89b3c, 0 0 40px #c89b3c;
    z-index: 10001;
    animation: fadeInOut 3s ease-in-out forwards;
    pointer-events: none;
  `;
  msg.textContent = '🎮 GOD MODE ACTIVATED! 🎮';
  document.body.appendChild(msg);
  
  // Add style for fade animation
  if (!document.getElementById('godModeStyle')) {
    const style = document.createElement('style');
    style.id = 'godModeStyle';
    style.textContent = `
      @keyframes fadeInOut {
        0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
      }
    `;
    document.head.appendChild(style);
  }
  
  setTimeout(() => msg.remove(), 3000);
  
  // Enable rainbow mode for 10 seconds
  document.body.classList.add('rainbow-mode');
  setTimeout(() => document.body.classList.remove('rainbow-mode'), 10000);
}

// Double-click logo Easter egg
function setupLogoEasterEgg() {
  const logo = document.querySelector('.logo');
  if (!logo) return;
  
  let clickCount = 0;
  let clickTimer = null;
  
  logo.addEventListener('click', (e) => {
    clickCount++;
    
    if (clickTimer) clearTimeout(clickTimer);
    
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, 500);
    
    if (clickCount === 3) {
      createConfetti(e.clientX, e.clientY, 50);
      logo.style.animation = 'spin 1s ease-in-out';
      setTimeout(() => logo.style.animation = '', 1000);
      clickCount = 0;
    }
  });
}

// ============================================
// PARTICLE BACKGROUND
// ============================================
function createParticleBackground() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: -1;
    opacity: 0.3;
  `;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  const particles = [];
  
  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = Math.random() * 0.5 - 0.25;
      this.vy = Math.random() * 0.5 - 0.25;
      this.size = Math.random() * 2 + 1;
      this.color = `rgba(200, 155, 60, ${Math.random() * 0.5 + 0.2})`;
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    
    draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  for (let i = 0; i < CONFIG.particleCount; i++) {
    particles.push(new Particle());
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    
    // Draw connections
    particles.forEach((p1, i) => {
      particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 100) {
          ctx.strokeStyle = `rgba(200, 155, 60, ${(1 - dist / 100) * 0.2})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ============================================
// ENHANCED INTERACTIONS
// ============================================
function enhanceButtons() {
  // Add visual effects to all buttons
  document.querySelectorAll('.btn, button').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.classList.add('pulse-glow');
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.classList.remove('pulse-glow');
    });
    
    btn.addEventListener('click', (e) => {
      createConfetti(e.clientX, e.clientY, 10);
    });
  });
}

function enhanceCards() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      // Visual effects only
    });
  });
}

function enhanceNavigation() {
  document.querySelectorAll('nav a').forEach(link => {
    // No sound effects needed
  });
}

// ============================================
// LOADING ANIMATIONS
// ============================================
function enhanceLoadingStates() {
  const style = document.createElement('style');
  style.textContent = `
    .loading-spinner {
      position: relative;
    }
    
    .loading-spinner::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 100%;
      border: 4px solid transparent;
      border-top-color: #9d4edd;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      animation: spin 1.5s linear infinite reverse;
    }
  `;
  document.head.appendChild(style);
}

// ============================================
// PAGE LOAD CELEBRATION
// ============================================
function celebratePageLoad() {
  setTimeout(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 4;
    createConfetti(centerX, centerY, 30);
  }, 500);
}

// ============================================
// SCROLL EFFECTS
// ============================================
function handleScroll() {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // Add subtle parallax effect to hero elements
  const hero = document.querySelector('.hero-content');
  if (hero) {
    const offset = scrollTop * 0.5;
    hero.style.transform = `translateY(${offset}px)`;
  }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  console.log('%c👾 KENNY\'S PLAYPLACE 👾', 'font-size: 20px; color: #c89b3c; font-weight: bold; text-shadow: 2px 2px 4px #000;');
  console.log('%cTry the Konami Code: ↑ ↑ ↓ ↓ ← → ← → B A', 'font-size: 14px; color: #cdbe91;');
  
  // Initialize all enhancements
  createParticleBackground();
  enhanceButtons();
  enhanceCards();
  enhanceNavigation();
  enhanceLoadingStates();
  setupLogoEasterEgg();
  celebratePageLoad();
  
  // Event listeners
  document.addEventListener('mousemove', createCursorTrail);
  document.addEventListener('keydown', checkKonamiCode);
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Settings toggle (press E to toggle enhancements)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'e' && e.ctrlKey) {
      e.preventDefault();
      CONFIG.enableCursorTrail = !CONFIG.enableCursorTrail;
      CONFIG.enableConfetti = !CONFIG.enableConfetti;
      
      const status = CONFIG.enableCursorTrail ? 'ENABLED' : 'DISABLED';
      console.log(`%cVisual Effects ${status}`, 'font-size: 16px; color: #c89b3c;');
    }
  });
});

// Export for use in other scripts
window.KennysPlayplace = {
  confetti: createConfetti,
  config: CONFIG
};
