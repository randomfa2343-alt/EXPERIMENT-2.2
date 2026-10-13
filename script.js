// Ancient Experiment 2.2 — Mini Game + Sounds & Animations

// ========== AUDIO (Web Audio API) ==========
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playTone(freq, type, duration, volume = 0.15, ramp = true) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  if (ramp) {
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  }
  osc.start(now);
  osc.stop(now + duration);
}

function playRuneSelect() {
  initAudio();
  playTone(520, 'triangle', 0.12, 0.12);
  setTimeout(() => playTone(780, 'triangle', 0.1, 0.08), 40);
}

function playChannel() {
  initAudio();
  playTone(180, 'sawtooth', 0.25, 0.1);
  setTimeout(() => playTone(320, 'triangle', 0.2, 0.12), 60);
  setTimeout(() => playTone(480, 'sine', 0.3, 0.1), 120);
}

function playCritical() {
  initAudio();
  playTone(660, 'square', 0.15, 0.1);
  setTimeout(() => playTone(880, 'square', 0.15, 0.1), 80);
  setTimeout(() => playTone(1100, 'triangle', 0.25, 0.12), 160);
}

function playScore() {
  initAudio();
  playTone(740, 'sine', 0.1, 0.08);
}

function playLevelUp() {
  initAudio();
  const notes = [523, 659, 784, 1046];
  notes.forEach((n, i) => {
    setTimeout(() => playTone(n, 'triangle', 0.35, 0.14), i * 120);
  });
}

function playReset() {
  initAudio();
  playTone(300, 'sawtooth', 0.2, 0.08);
  setTimeout(() => playTone(200, 'sawtooth', 0.3, 0.06), 100);
}

function playCrystalTap() {
  initAudio();
  playTone(900, 'sine', 0.08, 0.1);
  setTimeout(() => playTone(1200, 'sine', 0.12, 0.07), 50);
}

// ========== CANVAS BACKGROUND ==========
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
let particles = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Particle {
  constructor() {
    this.reset(true);
  }
  reset(initial = false) {
    this.x = Math.random() * canvas.width;
    this.y = initial ? Math.random() * canvas.height : canvas.height + 10;
    this.size = Math.random() * 2.5 + 0.5;
    this.speed = Math.random() * 0.7 + 0.25;
    this.alpha = Math.random() * 0.5 + 0.15;
    this.drift = (Math.random() - 0.5) * 0.5;
    this.color = Math.random() > 0.65 ? 'gold' : 'mystic';
  }
  update() {
    this.y -= this.speed;
    this.x += this.drift;
    if (this.y < -10) this.reset();
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color === 'gold'
      ? `rgba(212, 160, 23, ${this.alpha})`
      : `rgba(155, 93, 229, ${this.alpha})`;
    ctx.fill();
  }
}

for (let i = 0; i < 60; i++) particles.push(new Particle());

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const g = ctx.createRadialGradient(
    canvas.width / 2, canvas.height * 0.38, 0,
    canvas.width / 2, canvas.height * 0.38, canvas.width * 0.65
  );
  g.addColorStop(0, 'rgba(44, 33, 24, 0.45)');
  g.addColorStop(1, 'rgba(26, 18, 11, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animate);
}
animate();

// ========== GAME STATE ==========
let score = 0;
let level = 1;
let selected = null;
let power = 0;
let combo = 0;

const scoreEl = document.getElementById('score');
const scoreBox = document.querySelector('.score-box');
const logEl = document.getElementById('log');
const storyEl = document.getElementById('story-text');
const storyBox = document.querySelector('.story');
const crystal = document.getElementById('crystal');
const artifact = document.getElementById('artifact');
const levelEl = document.getElementById('level');
const burst = document.getElementById('burst');
const flash = document.getElementById('flash');
const comboFill = document.getElementById('combo-fill');
const comboText = document.getElementById('combo-text');
const channelBtn = document.getElementById('channel-btn');

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
  scoreBox.classList.add('pop');
  setTimeout(() => scoreBox.classList.remove('pop'), 250);
  playScore();
}

function updateComboUI() {
  const pct = Math.min(combo * 12.5, 100);
  comboFill.style.width = pct + '%';
  comboText.textContent = combo > 0 ? `Combo x${combo}` : 'Combo x0';
}

const stories = {
  1: "You stand before the sealed Chamber of Trials. The ancient runes await your touch...",
  2: "The crystal stirs. Choose the elements wisely to awaken greater power.",
  3: "The temple responds! Combine forces and channel the energy of the ancients.",
  4: "You have opened the inner sanctum. The final trial approaches...",
  5: "Legendary status achieved. The Experiment is complete... for now."
};

function updateLevel() {
  let leveled = false;
  if (score >= 200 && level < 5) {
    level = 5; levelEl.textContent = 'Legend'; leveled = true;
  } else if (score >= 120 && level < 4) {
    level = 4; levelEl.textContent = 'Trial 4'; leveled = true;
  } else if (score >= 60 && level < 3) {
    level = 3; levelEl.textContent = 'Trial 3'; leveled = true;
  } else if (score >= 25 && level < 2) {
    level = 2; levelEl.textContent = 'Trial 2'; leveled = true;
  }
  if (leveled) {
    storyEl.textContent = stories[level];
    storyBox.classList.add('levelup');
    setTimeout(() => storyBox.classList.remove('levelup'), 2000);
    log(level === 5 ? 'You have become a Master of the Ancient Experiment!' : 'A new Trial begins...', 'magic');
    playLevelUp();
    flash.classList.add('show');
    setTimeout(() => flash.classList.remove('show'), 300);
  }
}

function triggerBurst() {
  burst.classList.remove('go');
  void burst.offsetWidth; // reflow
  burst.classList.add('go');
}

function shake() {
  document.body.classList.remove('shake');
  void document.body.offsetWidth;
  document.body.classList.add('shake');
}

// ========== EVENTS ==========
document.querySelectorAll('.rune-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    initAudio();
    document.querySelectorAll('.rune-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selected = btn.dataset.power;
    playRuneSelect();

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

channelBtn.addEventListener('click', () => {
  initAudio();
  if (!selected) {
    log('The runes remain silent. Choose an element first.', 'warn');
    return;
  }

  power += 1;
  combo += 1;
  updateComboUI();

  const base = 5 + level * 2;
  const bonus = Math.min(combo, 8);
  const gained = base + bonus + Math.floor(Math.random() * 4);

  addScore(gained);
  log(`You channel ${selected.toUpperCase()} energy... +${gained} Essence`, 'gain');
  playChannel();

  crystal.classList.add('active');
  artifact.classList.add('powered');
  channelBtn.classList.add('pulse');
  triggerBurst();
  setTimeout(() => {
    crystal.classList.remove('active');
    channelBtn.classList.remove('pulse');
  }, 450);

  if (power >= 3) {
    crystal.classList.add('charged');
    log('The crystal pulses with ancient power!', 'magic');
  }

  if (combo >= 5) {
    const extra = 15;
    addScore(extra);
    log(`Combo x${combo}! Bonus +${extra} Essence`, 'gain');
  }

  // Critical chance
  if (Math.random() < 0.18) {
    const crit = 12 + level * 3;
    addScore(crit);
    log(`✦ CRITICAL RUNE ALIGNMENT! +${crit}`, 'magic');
    playCritical();
    shake();
    flash.classList.add('show');
    setTimeout(() => flash.classList.remove('show'), 250);
  }

  updateLevel();
});

crystal.addEventListener('click', () => {
  initAudio();
  if (power > 0) {
    const tiny = 2 + Math.floor(Math.random() * 4);
    addScore(tiny);
    log(`The crystal responds to your touch... +${tiny}`, 'gain');
    crystal.classList.add('active');
    playCrystalTap();
    triggerBurst();
    setTimeout(() => crystal.classList.remove('active'), 350);
  } else {
    log('The crystal is still dormant.', 'warn');
  }
});

document.getElementById('reset-btn').addEventListener('click', () => {
  initAudio();
  selected = null;
  power = 0;
  combo = 0;
  updateComboUI();
  document.querySelectorAll('.rune-btn').forEach(b => b.classList.remove('selected'));
  crystal.classList.remove('charged', 'active');
  artifact.classList.remove('powered');
  playReset();
  log('The chamber falls silent once more...', 'warn');
  storyEl.textContent = stories[level] || stories[1];
});

// Start message
log('The Chamber of Trials awaits...');
log('Select a rune, then Channel Power to begin the experiment.');
