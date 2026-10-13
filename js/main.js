import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { BLOCKS, BLOCK_LIST } from './blocks.js';

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // cap DPR
renderer.shadowMap.enabled = false; // major FPS win
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 45, 95);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);

// Cheaper lighting (no shadows)
const sun = new THREE.DirectionalLight(0xfff5e0, 1.05);
sun.position.set(40, 60, 20);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x8899aa, 0.6));

// World & Player
const world = new World(scene);
world.generate();

const player = new Player(camera, document.body, world);
const spawnY = world.getSpawnY(0, 0);
player.position.set(0.5, spawnY + 1.5, 0.5);

// Highlight (single wireframe box)
const highlight = new THREE.Mesh(
  new THREE.BoxGeometry(1.02, 1.02, 1.02),
  new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 })
);
highlight.visible = false;
scene.add(highlight);

// Reused vectors for targeting (no alloc per frame)
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _tmp = new THREE.Vector3();
let targetBlock = null;

// Hotbar
let selected = 0;
const hotbarEl = document.getElementById('hotbar');
function buildHotbar() {
  hotbarEl.innerHTML = '';
  BLOCK_LIST.forEach((name, i) => {
    const def = BLOCKS[name];
    const slot = document.createElement('div');
    slot.className = 'slot' + (i === selected ? ' selected' : '');
    slot.innerHTML = `<span class="key">${i + 1}</span><div class="swatch" style="background:#${def.color.toString(16).padStart(6, '0')}"></div>`;
    slot.addEventListener('click', () => { selected = i; updateHotbar(); });
    hotbarEl.appendChild(slot);
  });
}
function updateHotbar() {
  const kids = hotbarEl.children;
  for (let i = 0; i < kids.length; i++) kids[i].classList.toggle('selected', i === selected);
}
buildHotbar();

const hint = document.getElementById('hint');
document.addEventListener('click', () => {
  if (!player.locked) {
    player.lock();
    hint.classList.add('hide');
  }
});

document.addEventListener('keydown', e => {
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.replace('Digit', ''), 10);
    if (n >= 1 && n <= BLOCK_LIST.length) {
      selected = n - 1;
      updateHotbar();
    }
  }
});

document.addEventListener('wheel', e => {
  if (!player.locked) return;
  selected = (selected + (e.deltaY > 0 ? 1 : -1) + BLOCK_LIST.length) % BLOCK_LIST.length;
  updateHotbar();
});

document.addEventListener('mousedown', e => {
  if (!player.locked || !targetBlock) return;
  if (e.button === 0) {
    world.set(targetBlock.x, targetBlock.y, targetBlock.z, 0);
  } else if (e.button === 2) {
    const nx = targetBlock.x + targetBlock.nx;
    const ny = targetBlock.y + targetBlock.ny;
    const nz = targetBlock.z + targetBlock.nz;
    const pp = player.position;
    if (Math.abs(nx + 0.5 - pp.x) < 0.7 && Math.abs(nz + 0.5 - pp.z) < 0.7 &&
        ny < pp.y && ny + 1 > pp.y - 1.7) return;
    world.set(nx, ny, nz, BLOCKS[BLOCK_LIST[selected]].id);
  }
});
document.addEventListener('contextmenu', e => e.preventDefault());

function updateTarget() {
  _origin.copy(camera.position);
  camera.getWorldDirection(_dir);

  let hit = null;
  let px = 0, py = 0, pz = 0;
  let first = true;

  for (let t = 0; t < 6; t += 0.08) {
    _tmp.copy(_origin).addScaledVector(_dir, t);
    const bx = Math.floor(_tmp.x);
    const by = Math.floor(_tmp.y);
    const bz = Math.floor(_tmp.z);

    if (world.isSolid(bx, by, bz)) {
      hit = {
        x: bx, y: by, z: bz,
        nx: first ? 0 : px - bx,
        ny: first ? 1 : py - by,
        nz: first ? 0 : pz - bz,
      };
      break;
    }
    px = bx; py = by; pz = bz;
    first = false;
  }

  targetBlock = hit;
  if (hit) {
    highlight.visible = true;
    highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  } else {
    highlight.visible = false;
  }
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  player.update(dt);
  updateTarget();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
