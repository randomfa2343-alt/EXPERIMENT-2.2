// EXPERIMENT 2.2 — Interactive Demo

const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
let particles = [];
let particleCount = 80;
let energyBoost = 0;
let temp = 37.2;
let isRunning = false;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.size = Math.random() * 1.8 + 0.4;
    this.alpha = Math.random() * 0.5 + 0.15;
  }
  update() {
    const boost = 1 + energyBoost * 0.08;
    this.x += this.vx * boost;
    this.y += this.vy * boost;
    if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
      this.reset();
    }
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 240, 255, ${this.alpha})`;
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}
initParticles();

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.12 * (1 - dist / 120)})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  drawConnections();
  if (energyBoost > 0) energyBoost *= 0.97;
  requestAnimationFrame(animate);
}
animate();

// Console helpers
const consoleEl = document.getElementById('console');
function log(msg, type = '') {
  const line = document.createElement('div');
  line.className = 'line' + (type ? ' ' + type : '');
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  line.textContent = `[${time}] ${msg}`;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function updateTime() {
  document.getElementById('console-time').textContent =
    new Date().toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateTime, 1000);
updateTime();

// Status
const statusText = document.getElementById('status-text');

// Buttons
document.getElementById('run-btn').addEventListener('click', () => {
  isRunning = true;
  document.body.classList.add('running');
  statusText.textContent = 'EXPERIMENT RUNNING';
  log('>>> EXPERIMENT 2.2 INITIATED', 'info');
  log('Loading modules... OK');
  log('Particle field active');
  log('Sensors calibrated');
  energyBoost = 8;
});

document.getElementById('reset-btn').addEventListener('click', () => {
  isRunning = false;
  document.body.classList.remove('running', 'glitching');
  statusText.textContent = 'SYSTEM ONLINE';
  temp = 37.2;
  document.getElementById('temp-value').textContent = temp.toFixed(1);
  energyBoost = 0;
  log('System reset complete', 'warn');
  log('All parameters restored to baseline');
});

// Panel actions
document.querySelectorAll('.panel-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;

    if (action === 'particles') {
      energyBoost = 12;
      log('Energy injected into particle field (+12 units)', 'info');
    }

    if (action === 'glitch') {
      document.body.classList.add('glitching');
      log('GLITCH PROTOCOL ENGAGED', 'error');
      log('Visual corruption active for 2.5s');
      setTimeout(() => {
        document.body.classList.remove('glitching');
        log('Glitch protocol terminated — recovery OK');
      }, 2500);
    }

    if (action === 'scan') {
      log('Initiating full spectrum scan...', 'info');
      setTimeout(() => log('Frequency band 1-40Hz: clear'), 400);
      setTimeout(() => log('Frequency band 40-200Hz: minor noise detected', 'warn'), 800);
      setTimeout(() => log('Frequency band 200Hz-2kHz: nominal'), 1200);
      setTimeout(() => log('Scan complete. 1 anomaly flagged.', 'info'), 1600);
    }

    if (action === 'heat') {
      temp += (Math.random() * 4 + 2);
      if (temp > 85) temp = 85 + Math.random() * 3;
      document.getElementById('temp-value').textContent = temp.toFixed(1);
      log(`Core temperature raised → ${temp.toFixed(1)}°C`, temp > 70 ? 'error' : 'warn');
      if (temp > 75) {
        log('WARNING: Thermal threshold approaching', 'error');
      }
    }
  });
});

// Initial log
log('EXPERIMENT 2.2 environment ready');
log('Awaiting operator input...');
