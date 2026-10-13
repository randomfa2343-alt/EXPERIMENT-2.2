// GALAXY ATTACK · Experiment 2.2
// Classic space shooter + Bosses & more enemies

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
function sfxHit() { tone(150, 'sawtooth', 0.12, 0.09); }
function sfxExplosion() {
  tone(120, 'sawtooth', 0.3, 0.12);
  setTimeout(() => tone(80, 'sawtooth', 0.4, 0.08), 50);
}
function sfxBossHit() {
  tone(90, 'sawtooth', 0.2, 0.14);
  setTimeout(() => tone(60, 'square', 0.25, 0.1), 60);
}
function sfxBossSpawn() {
  [200, 250, 300, 400, 500].forEach((f, i) => setTimeout(() => tone(f, 'sawtooth', 0.2, 0.1), i * 80));
}
function sfxPower() { tone(600, 'sine', 0.1, 0.1); setTimeout(() => tone(900, 'sine', 0.15, 0.1), 80); }
function sfxGameOver() {
  [400, 320, 250, 180].forEach((f, i) => setTimeout(() => tone(f, 'sawtooth', 0.3, 0.1), i * 150));
}

// ========== GAME STATE ==========
let state = 'start';
let score = 0;
let wave = 1;
let lives = 3;
let keys = {};
let player, bullets, enemyBullets, enemies, particles, stars, powerups;
let enemyTimer = 0;
let shootCooldown = 0;
let invincible = 0;
let bossActive = false;
let boss = null;
let bossSpawnedForWave = 0;
let bestScore = parseInt(localStorage.getItem('galaxyBest') || '0');

document.getElementById('best-score').textContent = bestScore;

// ========== ENTITIES ==========
function createPlayer() {
  return {
    x: canvas.width / 2,
    y: canvas.height - 70,
    w: 36,
    h: 40,
    speed: 5.5
  };
}

function createBullet(x, y, fromPlayer = true, angle = 0) {
  const speed = fromPlayer ? 11 : 4.5;
  return {
    x, y,
    w: fromPlayer ? 4 : 6,
    h: fromPlayer ? 14 : 10,
    speed,
    fromPlayer,
    vx: Math.sin(angle) * speed,
    vy: fromPlayer ? -speed : Math.cos(angle) * speed
  };
}

// Enemy types: 0=basic, 1=tank, 2=fast, 3=zigzag, 4=shooter, 5=swarm
function createEnemy(type = 0) {
  const types = [
    { w: 32, h: 28, hp: 1, speed: 1.5 + wave * 0.12, score: 10, color: '#ff2d95', name: 'Scout' },
    { w: 42, h: 36, hp: 3, speed: 1.0 + wave * 0.08, score: 30, color: '#ffcc00', name: 'Tank' },
    { w: 26, h: 22, hp: 1, speed: 2.4 + wave * 0.18, score: 15, color: '#00f0ff', name: 'Dart' },
    { w: 34, h: 30, hp: 2, speed: 1.7 + wave * 0.1, score: 20, color: '#9b5de5', name: 'Zigzag' },
    { w: 36, h: 32, hp: 2, speed: 1.3 + wave * 0.09, score: 35, color: '#00ff88', name: 'Shooter' },
    { w: 20, h: 18, hp: 1, speed: 2.0 + wave * 0.15, score: 8, color: '#ff6b35', name: 'Swarm' }
  ];
  const t = types[type % types.length];
  return {
    x: 30 + Math.random() * (canvas.width - 60),
    y: -40 - Math.random() * 30,
    ...t,
    type,
    vx: (Math.random() - 0.5) * (type === 3 ? 3 : 1.2),
    shootTimer: 40 + Math.random() * 60,
    angle: 0
  };
}

function createBoss() {
  sfxBossSpawn();
  return {
    x: canvas.width / 2,
    y: -80,
    w: 90,
    h: 70,
    hp: 40 + wave * 8,
    maxHp: 40 + wave * 8,
    speed: 1.1,
    score: 500 + wave * 50,
    color: '#ff0044',
    vx: 1.8,
    phase: 1,
    shootTimer: 30,
    entry: true
  };
}

function createParticle(x, y, color) {
  return {
    x, y,
    vx: (Math.random() - 0.5) * 7,
    vy: (Math.random() - 0.5) * 7,
    life: 25 + Math.random() * 25,
    maxLife: 50,
    size: 2 + Math.random() * 3.5,
    color
  };
}

function createStars() {
  const s = [];
  for (let i = 0; i < 90; i++) {
    s.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.2,
      speed: 0.25 + Math.random() * 1.4,
      alpha: 0.25 + Math.random() * 0.75
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

let touchLeft = false, touchRight = false, touchShoot = false;
document.getElementById('left-btn').addEventListener('touchstart', e => { e.preventDefault(); touchLeft = true; });
document.getElementById('left-btn').addEventListener('touchend', () => touchLeft = false);
document.getElementById('right-btn').addEventListener('touchstart', e => { e.preventDefault(); touchRight = true; });
document.getElementById('right-btn').addEventListener('touchend', () => touchRight = false);
document.getElementById('shoot-btn').addEventListener('touchstart', e => { e.preventDefault(); touchShoot = true; });
document.getElementById('shoot-btn').addEventListener('touchend', () => touchShoot = false);

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
  enemyBullets = [];
  enemies = [];
  particles = [];
  powerups = [];
  stars = createStars();
  enemyTimer = 0;
  invincible = 0;
  bossActive = false;
  boss = null;
  bossSpawnedForWave = 0;

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
  document.getElementById('wave').textContent = wave + (bossActive ? ' ⚠ BOSS' : '');
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
    shootCooldown = 11;
    sfxShoot();
  }

  // Player bullets
  bullets.forEach(b => {
    b.x += b.vx || 0;
    b.y += b.vy;
  });
  bullets = bullets.filter(b => b.y > -30 && b.y < canvas.height + 30);

  // Enemy bullets
  enemyBullets.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
  });
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height + 20 && b.y > -20);

  // Boss spawn every 5 waves
  if (!bossActive && wave >= 5 && wave % 5 === 0 && bossSpawnedForWave !== wave && enemies.length < 3) {
    boss = createBoss();
    bossActive = true;
    bossSpawnedForWave = wave;
    enemies = []; // clear small enemies for boss fight
    updateHUD();
  }

  // Spawn normal enemies (only when no boss)
  if (!bossActive) {
    enemyTimer--;
    if (enemyTimer <= 0) {
      let type;
      const r = Math.random();
      if (r < 0.15) type = 5;      // swarm
      else if (r < 0.28) type = 1; // tank
      else if (r < 0.42) type = 2; // dart
      else if (r < 0.55) type = 3; // zigzag
      else if (r < 0.68) type = 4; // shooter
      else type = 0;               // basic

      // swarm spawns 3 at once
      if (type === 5) {
        for (let i = 0; i < 3; i++) {
          const s = createEnemy(5);
          s.x = 40 + Math.random() * (canvas.width - 80);
          s.y = -30 - i * 25;
          enemies.push(s);
        }
      } else {
        enemies.push(createEnemy(type));
      }
      enemyTimer = Math.max(18, 50 - wave * 2.5);
    }
  }

  // Update enemies
  enemies.forEach(e => {
    e.y += e.speed;
    e.x += e.vx;

    // Zigzag pattern
    if (e.type === 3) {
      e.angle += 0.08;
      e.x += Math.sin(e.angle) * 2.2;
    }

    // Bounce walls
    if (e.x < e.w / 2 || e.x > canvas.width - e.w / 2) e.vx *= -1;

    // Shooter enemies fire
    if (e.type === 4) {
      e.shootTimer--;
      if (e.shootTimer <= 0 && e.y > 20 && e.y < canvas.height * 0.7) {
        const angle = Math.atan2(player.x - e.x, player.y - e.y);
        enemyBullets.push(createBullet(e.x, e.y + e.h / 2, false, angle));
        e.shootTimer = 70 + Math.random() * 40;
      }
    }
  });

  // Update Boss
  if (bossActive && boss) {
    if (boss.entry) {
      boss.y += 1.8;
      if (boss.y >= 90) boss.entry = false;
    } else {
      boss.x += boss.vx;
      if (boss.x < boss.w / 2 + 10 || boss.x > canvas.width - boss.w / 2 - 10) boss.vx *= -1;

      // Phase 2 at 50% HP
      if (boss.hp < boss.maxHp * 0.5) boss.phase = 2;

      boss.shootTimer--;
      if (boss.shootTimer <= 0) {
        // Spread shot
        const count = boss.phase === 2 ? 5 : 3;
        for (let i = 0; i < count; i++) {
          const spread = (i - (count - 1) / 2) * 0.35;
          const angle = Math.PI + spread; // downward-ish
          enemyBullets.push(createBullet(boss.x, boss.y + boss.h / 2, false, angle));
        }
        // Aimed shot in phase 2
        if (boss.phase === 2) {
          const aim = Math.atan2(player.x - boss.x, player.y - boss.y);
          enemyBullets.push(createBullet(boss.x, boss.y + 20, false, aim));
        }
        boss.shootTimer = boss.phase === 2 ? 35 : 55;
      }
    }
  }

  // Collisions: player bullets vs enemies
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      const e = enemies[ei];
      if (b.x > e.x - e.w / 2 && b.x < e.x + e.w / 2 &&
          b.y > e.y - e.h / 2 && b.y < e.y + e.h / 2) {
        e.hp--;
        bullets.splice(bi, 1);
        sfxHit();
        for (let i = 0; i < 5; i++) particles.push(createParticle(e.x, e.y, e.color));
        if (e.hp <= 0) {
          score += e.score;
          enemies.splice(ei, 1);
          sfxExplosion();
          for (let i = 0; i < 12; i++) particles.push(createParticle(e.x, e.y, e.color));
          if (Math.random() < 0.1) {
            powerups.push({ x: e.x, y: e.y, vy: 2.2, type: Math.random() < 0.6 ? 'life' : 'score' });
          }
          if (score > wave * 150) {
            wave++;
            updateHUD();
          }
        }
        updateHUD();
        break;
      }
    }
  }

  // Player bullets vs Boss
  if (bossActive && boss) {
    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      if (b.x > boss.x - boss.w / 2 && b.x < boss.x + boss.w / 2 &&
          b.y > boss.y - boss.h / 2 && b.y < boss.y + boss.h / 2) {
        boss.hp--;
        bullets.splice(bi, 1);
        sfxBossHit();
        for (let i = 0; i < 4; i++) particles.push(createParticle(b.x, b.y, '#ff0044'));
        if (boss.hp <= 0) {
          score += boss.score;
          sfxExplosion();
          for (let i = 0; i < 40; i++) particles.push(createParticle(boss.x, boss.y, '#ff0044'));
          for (let i = 0; i < 20; i++) particles.push(createParticle(boss.x, boss.y, '#ffcc00'));
          powerups.push({ x: boss.x, y: boss.y, vy: 1.5, type: 'life' });
          powerups.push({ x: boss.x - 30, y: boss.y, vy: 1.8, type: 'score' });
          bossActive = false;
          boss = null;
          wave++;
          updateHUD();
        }
        updateHUD();
      }
    }
  }

  // Enemy bullets hit player
  if (invincible <= 0) {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const b = enemyBullets[i];
      if (Math.abs(b.x - player.x) < 18 && Math.abs(b.y - player.y) < 22) {
        lives--;
        invincible = 90;
        enemyBullets.splice(i, 1);
        sfxExplosion();
        for (let p = 0; p < 15; p++) particles.push(createParticle(player.x, player.y, '#00f0ff'));
        updateHUD();
        if (lives <= 0) gameOver();
      }
    }
  }

  // Enemies hit player
  if (invincible > 0) invincible--;
  for (let ei = enemies.length - 1; ei >= 0; ei--) {
    const e = enemies[ei];
    if (invincible <= 0 &&
        Math.abs(e.x - player.x) < (e.w + player.w) / 2 - 6 &&
        Math.abs(e.y - player.y) < (e.h + player.h) / 2 - 6) {
      lives--;
      invincible = 90;
      sfxExplosion();
      for (let i = 0; i < 18; i++) particles.push(createParticle(player.x, player.y, '#00f0ff'));
      enemies.splice(ei, 1);
      updateHUD();
      if (lives <= 0) gameOver();
    }
    if (e.y > canvas.height + 50) enemies.splice(ei, 1);
  }

  // Boss body damage
  if (bossActive && boss && invincible <= 0 && !boss.entry) {
    if (Math.abs(boss.x - player.x) < (boss.w + player.w) / 2 - 10 &&
        Math.abs(boss.y - player.y) < (boss.h + player.h) / 2 - 10) {
      lives--;
      invincible = 100;
      sfxExplosion();
      for (let i = 0; i < 20; i++) particles.push(createParticle(player.x, player.y, '#ff0044'));
      updateHUD();
      if (lives <= 0) gameOver();
    }
  }

  // Powerups
  powerups.forEach((p, i) => {
    p.y += p.vy;
    if (Math.abs(p.x - player.x) < 28 && Math.abs(p.y - player.y) < 28) {
      if (p.type === 'life' && lives < 3) {
        lives++;
        sfxPower();
      } else if (p.type === 'score') {
        score += 50;
        sfxPower();
      }
      powerups.splice(i, 1);
      updateHUD();
    }
    if (p.y > canvas.height) powerups.splice(i, 1);
  });

  // Particles
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    p.vx *= 0.95;
    p.vy *= 0.95;
  });
  particles = particles.filter(p => p.life > 0);

  // Stars
  stars.forEach(s => {
    s.y += s.speed * (bossActive ? 1.8 : 1);
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  });
}

// ========== DRAW ==========
function drawShip(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(16, 16);
  ctx.lineTo(6, 10);
  ctx.lineTo(-6, 10);
  ctx.lineTo(-16, 16);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, -4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.moveTo(-5, 12);
  ctx.lineTo(0, 22 + Math.random() * 8);
  ctx.lineTo(5, 12);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = e.color;
  ctx.shadowColor = e.color;
  ctx.shadowBlur = 10;

  if (e.type === 1) { // Tank
    ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
    ctx.fillStyle = '#222';
    ctx.fillRect(-8, -8, 16, 16);
  } else if (e.type === 2) { // Dart
    ctx.beginPath();
    ctx.moveTo(0, -e.h / 2);
    ctx.lineTo(e.w / 2, 0);
    ctx.lineTo(0, e.h / 2);
    ctx.lineTo(-e.w / 2, 0);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 3) { // Zigzag
    ctx.beginPath();
    ctx.moveTo(0, -e.h / 2);
    ctx.lineTo(e.w / 2, -e.h / 6);
    ctx.lineTo(e.w / 3, e.h / 2);
    ctx.lineTo(-e.w / 3, e.h / 2);
    ctx.lineTo(-e.w / 2, -e.h / 6);
    ctx.closePath();
    ctx.fill();
  } else if (e.type === 4) { // Shooter
    ctx.beginPath();
    ctx.arc(0, 0, e.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(0, 4, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 5) { // Swarm
    ctx.beginPath();
    ctx.moveTo(0, e.h / 2);
    ctx.lineTo(e.w / 2, -e.h / 2);
    ctx.lineTo(0, -e.h / 4);
    ctx.lineTo(-e.w / 2, -e.h / 2);
    ctx.closePath();
    ctx.fill();
  } else { // Basic Scout
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

function drawBoss(b) {
  ctx.save();
  ctx.translate(b.x, b.y);

  // Glow
  ctx.shadowColor = b.color;
  ctx.shadowBlur = 25;

  // Main body
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.moveTo(0, -b.h / 2);
  ctx.lineTo(b.w / 2, -b.h / 6);
  ctx.lineTo(b.w / 2.5, b.h / 2);
  ctx.lineTo(-b.w / 2.5, b.h / 2);
  ctx.lineTo(-b.w / 2, -b.h / 6);
  ctx.closePath();
  ctx.fill();

  // Core
  ctx.fillStyle = b.phase === 2 ? '#ffcc00' : '#ff6699';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-18, -12, 6, 0, Math.PI * 2);
  ctx.arc(18, -12, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-18, -10, 3, 0, Math.PI * 2);
  ctx.arc(18, -10, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // HP bar
  const barW = 80;
  const hpPct = b.hp / b.maxHp;
  ctx.fillStyle = '#333';
  ctx.fillRect(-barW / 2, -b.h / 2 - 18, barW, 8);
  ctx.fillStyle = hpPct > 0.5 ? '#00ff88' : (hpPct > 0.25 ? '#ffcc00' : '#ff0044');
  ctx.fillRect(-barW / 2, -b.h / 2 - 18, barW * hpPct, 8);

  ctx.restore();
}

function draw() {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  stars.forEach(s => {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  if (state === 'playing' || state === 'gameover') {
    // Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Player bullets
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    ctx.shadowBlur = 0;

    // Enemy bullets
    ctx.fillStyle = '#ff4466';
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur = 6;
    enemyBullets.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Enemies
    enemies.forEach(drawEnemy);

    // Boss
    if (bossActive && boss) drawBoss(boss);

    // Powerups
    powerups.forEach(p => {
      ctx.fillStyle = p.type === 'life' ? '#00ff88' : '#ffcc00';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.type === 'life' ? '+' : '$', p.x, p.y + 5);
    });

    // Player
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

stars = createStars();
