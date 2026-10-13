// Ancient Experiment 2.2 — Mini Game

const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
let particles = [];
let score = 0;
let level = 1;
let selected = null;
let power = 0;
let combo = 0;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Floating dust / embers
class Particle {
  constructor() {
    this.reset(true);
  }
  reset(initial = false) {
    this.x = Math.random() * canvas.width;
    this.y = initial ? Math.random() * canvas.height : canvas.height + 10;
    this.size = Math.random() * 2.5 + 0.5;
    this.speed = Math.random() * 0.6 + 0.2;
    this.alpha = Math.random() * 0.5 + 0.15;
    this.drift = (Math.random() - 0.5) * 0.4;
    this.color = Math.random() > 0.7 ? '#d4a017' : '#9b5de5';
  }
  update() {
    this.y -= this.speed;
    this.x += this.drift;
    if (this.y < -10) this.reset();
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace(')', `, ${this.alpha})`).replace('#', 'rgba(').replace(/(.{2})(.{2})(.{2})/, (_, r, g, b) => {
      return `${parseInt(r,16)}, ${parseInt(g,16)}, ${parseInt(b,16)}`;
    });
    // simpler:
    ctx.fillStyle = this.color === '#d4a017'
      ? `rgba(212, 160, 23, ${this.alpha})`
      : `rgba(155, 93, 229, ${this.alpha})`;
    ctx.fill();
  }
}

for (let i = 0; i < 55; i++) particles.push(new Particle());

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // subtle radial glow
  const g = ctx.createRadialGradient(
    canvas.width/2, canvas.height*0.4, 0,
    canvas.width/2, canvas.height*0.4, canvas.width*0.6
  );
  g.addColorStop(0, 'rgba(44, 33, 24, 0.4)');
  g.addColorStop(1, 'rgba(26, 18, 11, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animate);
}
animate();

// Game logic
const scoreEl = document.getElementById('score');
const logEl = document.getElementById('log');
const storyEl = document.getElementById('story-text');
const crystal = document.getElementById('crystal');
const artifact = document.getElementById('artifact');
const levelEl = document.getElementById('level');

function log(msg, type = '') {
  const entry = document.createElement('div');
  entry.className = 'entry' + (type ? ' ' + type : '');
  entry.textContent = '• ' + msg;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function addScore(amount) {
  score += amount;
  scoreEl.textContent = score;
  scoreEl.style.transform = 'scale(1.3)';
  setTimeout(() => scoreEl.style.transform = 'scale(1)', 200);
}

const stories = {
  1: "You stand before the sealed Chamber of Trials. The ancient runes await your touch...",
  2: "The crystal stirs. Choose the elements wisely to awaken greater power.",
  3: "The temple responds! Combine forces and channel the energy of the ancients.",
  4: "You have opened the inner sanctum. The final trial approaches...",
  5: "Legendary status achieved. The Experiment is complete... for now."
};

function updateLevel() {
  if (score >= 200 && level < 5) {
    level = 5;
    levelEl.textContent = 'Legend';
    storyEl.textContent = stories[5];
    log('You have become a Master of the Ancient Experiment!', 'magic');
  } else if (score >= 120 && level < 4) {
    level = 4;
    levelEl.textContent = 'Trial 4';
    storyEl.textContent = stories[4];
    log('The inner sanctum opens...', 'magic');
  } else if (score >= 60 && level < 3) {
    level = 3;
    levelEl.textContent = 'Trial 3';
    storyEl.textContent = stories[3];
    log('The temple awakens to your presence.', 'magic');
  } else if (score >= 25 && level < 2) {
    level = 2;
    levelEl.textContent = 'Trial 2';
    storyEl.textContent = stories[2];
    log('The first seals have broken.', 'magic');
  }
}

// Rune selection
document.querySelectorAll('.rune-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.rune-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selected = btn.dataset.power;

    const names = {
      fire: 'Flame of the Ancients',
      water: 'Tears of the Deep',
      earth: 'Stone of the First Age',
      air: 'Breath of the Sky Gods',
      spirit: 'Essence of the Void'
    };
    log(`You invoke the ${names[selected]}.`, 'magic');
  });
});

// Channel Power
document.getElementById('channel-btn').addEventListener('click', () => {
  if (!selected) {
    log('The runes remain silent. Choose an element first.', 'warn');
    return;
  }

  power += 1;
  combo += 1;

  const base = 5 + level * 2;
  const bonus = Math.min(combo, 8);
  const gained = base + bonus + Math.floor(Math.random() * 4);

  addScore(gained);
  log(`You channel ${selected.toUpperCase()} energy... +${gained} Essence`, 'gain');

  crystal.classList.add('active');
  artifact.classList.add('powered');
  setTimeout(() => crystal.classList.remove('active'), 400);

  if (power >= 3) {
    crystal.classList.add('charged');
    log('The crystal pulses with ancient power!', 'magic');
  }

  // Special combos
  if (combo >= 5) {
    const extra = 15;
    addScore(extra);
    log(`Combo x${combo}! Bonus +${extra} Essence`, 'gain');
  }

  updateLevel();

  // Small chance of critical
  if (Math.random() < 0.15) {
    const crit = 12 + level * 3;
    addScore(crit);
    log(`✦ CRITICAL RUNE ALIGNMENT! +${crit}`, 'magic');
  }
});

// Click the crystal for fun
crystal.addEventListener('click', () => {
  if (power > 0) {
    const tiny = 2 + Math.floor(Math.random() * 3);
    addScore(tiny);
    log(`The crystal responds to your touch... +${tiny}`, 'gain');
    crystal.classList.add('active');
    setTimeout(() => crystal.classList.remove('active'), 300);
  } else {
    log('The crystal is still dormant.', 'warn');
  }
});

// Reset
document.getElementById('reset-btn').addEventListener('click', () => {
  selected = null;
  power = 0;
  combo = 0;
  document.querySelectorAll('.rune-btn').forEach(b => b.classList.remove('selected'));
  crystal.classList.remove('charged', 'active');
  artifact.classList.remove('powered');
  log('The chamber falls silent once more...', 'warn');
  storyEl.textContent = stories[level] || stories[1];
});

// Start
log('The Chamber of Trials awaits...');
log('Select a rune, then Channel Power to begin the experiment.');
