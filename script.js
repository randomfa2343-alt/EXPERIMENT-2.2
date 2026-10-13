// GALAXY ATTACK · Experiment 2.2
// Classic space shooter

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const container = document.getElementById('game-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// ========== AUDIO ==========
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
function initAudio() {
  if (!actx) actx = new AudioCtx();
}
function tone(freq, type, dur, vol = 0.1) {
  if (!actx) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = vol;
  o.connect(g);
  g.connect(actx.destination);
  const t = actx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t);
  o.stop(t + dur);
}
function sfxShoot() { tone(880, 'square', 0.08, 0.06); }
function sfxHit() { tone(150, 'sawtooth', 0.15, 0.1); }
function sfxExplosion() {
  tone(120, 'sawtooth', 0.3, 0.12);
  setTimeout(() => tone(80, 'sawtooth', 0.4, 0.08), 50);
}
function sfxPower() { tone(600, 'sine', 0.1, 0.1); setTimeout(() => tone(900, 'sine', 0.15, 0.1), 80); }
function sfxGameOver() {
  [400, 320, 250, 180].forEach((f, i) => setTimeout(() => tone(f, 'sawtooth', 0.3, 0.1), i * 150));
}

// ========== GAME STATE ==========
let state = 'start'; // start | playing | gameover
let score = 0;
let wave = 1;
let lives = 3;
let keys = {};
let player, bullets, enemies, particles, stars, powerups;
let enemyTimer = 0;
let shootCooldown = 0;
let invincible = 0;
let bestScore = parseInt(localStorage.getItem('galaxyBest') || '0');

document.getElementById('best-score').textContent = bestScore;

// ========== ENTITIES ==========
function createPlayer() {
  return {
    x: canvas.width / 2,
    y: canvas.height - 70,
    w: 36,
    h: 40,
    speed: 5.5,
    cooldown: 0
  };
}

function createBullet(x, y) {
  return { x, y, w: 4, h: 14, speed: 11, fromPlayer: true };
}

function createEnemy(type = 0) {
  const types = [
    { w: 32, h: 28, hp: 1, speed: 1.6 + wave * 0.15, score: 10, color: '#ff2d95' },
    { w: 40, h: 34, hp: 2, speed: 1.2 + wave * 0.1, score: 25, color: '#ffcc00' },
    { w: 28, h: 24, hp: 1, speed: 2.2 + wave * 0.2, score: 15, color: '#00f0ff' }
  ];
  const t = types[type % types.length];
  return {
    x: 30 + Math.random() * (canvas.width - 60),
    y: -40,
    ...t,
    type,
    vx: (Math.random() - 0.5) * 1.5
  };
}

function createParticle(x, y, color) {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 6,
    vy: (Math.random() - 0.5) * 6,
    life: 30 + Math.random() * 20,
    maxLife: 50,
    size: 2 + Math.random() * 3,
    color
  };
}

function createStars() {
  const s = [];
  for (let i = 0; i < 80; i++) {
    s.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: 0.3 + Math.random() * 1.2,
      alpha: 0.3 + Math.random() * 0.7
    });
  }
  return s;
}

// ========== INPUT ==========
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => keys[e.code] = false);

// Touch / mobile
let touchLeft = false, touchRight = false, touchShoot = false;
document.getElementById('left-btn').addEventListener('touchstart', e => { e.preventDefault(); touchLeft = true; });
document.getElementById('left-btn').addEventListener('touchend', () => touchLeft = false);
document.getElementById('right-btn').addEventListener('touchstart', e => { e.preventDefault(); touchRight = true; });
document.getElementById('right-btn').addEventListener('touchend', () => touchRight = false);
document.getElementById('shoot-btn').addEventListener('touchstart', e => { e.preventDefault(); touchShoot = true; });
document.getElementById('shoot-btn').addEventListener('touchend', () => touchShoot = false);

// Mouse shoot on canvas
canvas.addEventListener('mousedown', () => { if (state === 'playing') touchShoot = true; });
canvas.addEventListener('mouseup', () => touchShoot = false);

// ========== GAME FLOW ==========
function startGame() {
  initAudio();
  state = 'playing';
  score = 0;
  wave = 1;
  lives = 3;
  player = createPlayer();
  bullets = [];
  enemies = [];
  particles = [];
  powerups = [];
  stars = createStars();
  enemyTimer = 0;
  invincible = 0;

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  if (window.innerWidth < 500) {
    document.getElementById('mobile-controls').classList.remove('hidden');
  }
  updateHUD();
}

function gameOver() {
  state = 'gameover';
  sfxGameOver();
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('galaxyBest', bestScore);
    document.getElementById('best-score').textContent = bestScore;
  }
  document.getElementById('final-score').textContent = score;
  document.getElementById('final-wave').textContent = wave;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('mobile-controls').classList.add('hidden');
  document.getElementById('gameover-screen').classList.remove('hidden');
}

function updateHUD() {
  document.getElementById('score').textContent = score;
  document.getElementById('wave').textContent = wave;
  document.getElementById('lives').textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// ========== UPDATE ==========
function update() {
  if (state !== 'playing') return;

  // Player movement
  let move = 0;
  if (keys['ArrowLeft'] || keys['KeyA'] || touchLeft) move = -1;
  if (keys['ArrowRight'] || keys['KeyD'] || touchRight) move = 1;
  player.x += move * player.speed;
  player.x = Math.max(player.w / 2, Math.min(canvas.width - player.w / 2, player.x));

  // Shooting
  if (shootCooldown > 0) shootCooldown--;
  if ((keys['Space'] || touchShoot) && shootCooldown <= 0) {
    bullets.push(createBullet(player.x - 2, player.y - 20));
    shootCooldown = 12;
    sfxShoot();
  }

  // Bullets
  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > -20);

  // Spawn enemies
  enemyTimer--;
  if (enemyTimer <= 0) {
    const type = Math.random() < 0.2 ? 1 : (Math.random() < 0.3 ? 2 : 0);
    enemies.push(createEnemy(type));
    enemyTimer = Math.max(25, 55 - wave * 3);
  }

  // Enemies
  enemies.forEach(e => {
    e.y += e.speed;
    e.x += e.vx;
    if (e.x < e.w / 2 || e.x > canvas.width - e.w / 2) e.vx *= -1;
  });

  // Collisions: bullets vs enemies
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (b.x > e.x - e.w / 2 && b.x < e.x + e.w / 2 &&
          b.y > e.y - e.h / 2 && b.y < e.y + e.h / 2) {
        e.hp--;
        bullets.splice(bi, 1);
        sfxHit();
        for (let i = 0; i < 6; i++) particles.push(createParticle(e.x, e.y, e.color));
        if (e.hp <= 0) {
          score += e.score;
          enemies.splice(ei, 1);
          sfxExplosion();
          for (let i = 0; i < 14; i++) particles.push(createParticle(e.x, e.y, e.color));
          // chance powerup
          if (Math.random() < 0.08) {
            powerups.push({ x: e.x, y: e.y, vy: 2, type: 'life' });
          }
          // wave progress
          if (score > wave * 120) {
            wave++;
            updateHUD();
          }
        }
        updateHUD();
      }
    });
  });

  // Enemies hit player
  if (invincible > 0) invincible--;
  enemies.forEach((e, ei) => {
    if (invincible <= 0 &&
        Math.abs(e.x - player.x) < (e.w + player.w) / 2 - 4 &&
        Math.abs(e.y - player.y) < (e.h + player.h) / 2 - 4) {
      lives--;
      invincible = 90;
      sfxExplosion();
      for (let i = 0; i < 20; i++) particles.push(createParticle(player.x, player.y, '#00f0ff'));
      enemies.splice(ei, 1);
      updateHUD();
      if (lives <= 0) gameOver();
    }
    // enemy off screen
    if (e.y > canvas.height + 40) {
      enemies.splice(ei, 1);
    }
  });

  // Powerups
  powerups.forEach((p, i) => {
    p.y += p.vy;
    if (Math.abs(p.x - player.x) < 25 && Math.abs(p.y - player.y) < 25) {
      if (p.type === 'life' && lives < 3) {
        lives++;
        sfxPower();
        updateHUD();
      }
      powerups.splice(i, 1);
    }
    if (p.y > canvas.height) powerups.splice(i, 1);
  });

  // Particles
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    p.vx *= 0.96;
    p.vy *= 0.96;
  });
  particles = particles.filter(p => p.life > 0);

  // Stars
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  });
}

// ========== DRAW ==========
function drawShip(x, y, color, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(16, 16);
  ctx.lineTo(6, 10);
  ctx.lineTo(-6, 10);
  ctx.lineTo(-16, 16);
  ctx.closePath();
  ctx.fill();
  // cockpit
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  // engine glow
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.lineTo(0, 22 + Math.random() * 6);
  ctx.lineTo(5, 12);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 12;
  if (e.type === 1) {
    // tanky
    ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
    ctx.fillStyle = '#111';
    ctx.fillRect(-6, -6, 12, 12);
  } else if (e.type === 2) {
    // fast diamond
    ctx.beginPath();
    ctx.moveTo(0, -e.h / 2);
    ctx.lineTo(e.w / 2, 0);
    ctx.lineTo(0, e.h / 2);
    ctx.lineTo(-e.w / 2, 0);
    ctx.closePath();
    ctx.fill();
  } else {
    // basic
    ctx.beginPath();
    ctx.moveTo(0, e.h / 2);
    ctx.lineTo(e.w / 2, -e.h / 2);
    ctx.lineTo(-e.w / 2, -e.h / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function draw() {
  // clear
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // stars
  stars.forEach(s => {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  if (state === 'playing' || state === 'gameover') {
    // particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // bullets
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    bullets.forEach(b => {
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    ctx.shadowBlur = 0;

    // enemies
    enemies.forEach(drawEnemy);

    // powerups
    powerups.forEach(p => {
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('+', p.x, p.y + 4);
    });

    // player
    if (state === 'playing') {
      if (invincible <= 0 || Math.floor(invincible / 4) % 2 === 0) {
        drawShip(player.x, player.y, '#00f0ff');
      }
    }
  }
}

// ========== LOOP ==========
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

// Initial stars for start screen
stars = createStars();
