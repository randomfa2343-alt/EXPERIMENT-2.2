import * as THREE from 'three';
import { World } from './world.js';
import { Player } from './player.js';
import { BLOCKS, BLOCK_LIST, getBlockById } from './blocks.js';

// --- Renderer & Scene ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 40, 90);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);

// Lights
const sun = new THREE.DirectionalLight(0xfff5e0, 1.1);
sun.position.set(40, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x8899aa, 0.55));

// World & Player
const world = new World(scene);
world.generate();

const player = new Player(camera, document.body, world);
const spawnY = world.getSpawnY(0, 0);
player.position.set(0.5, spawnY + 1.5, 0.5);

// Block highlight
const highlightGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
const highlightMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  wireframe: true,
  transparent: true,
  opacity: 0.6,
});
const highlight = new THREE.Mesh(highlightGeo, highlightMat);
highlight.visible = false;
scene.add(highlight);

// Raycaster for targeting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0); // center
let targetBlock = null; // { x,y,z, faceNormal }

// Hotbar
let selected = 0;
const hotbarEl = document.getElementById('hotbar');
function buildHotbar() {
  hotbarEl.innerHTML = '';
  BLOCK_LIST.forEach((name, i) => {
    const def = BLOCKS[name];
    const slot = document.createElement('div');
    slot.className = 'slot' + (i === selected ? ' selected' : '');
    slot.innerHTML = `<span class="key">${i + 1}</span><div class="swatch" style="background:#${def.color.toString(16).padStart(6,'0')}"></div>`;
    slot.addEventListener('click', () => { selected = i; updateHotbar(); });
    hotbarEl.appendChild(slot);
  });
}
function updateHotbar() {
  [...hotbarEl.children].forEach((el, i) => {
    el.classList.toggle('selected', i === selected);
  });
}
buildHotbar();

// Input
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

// Break / Place
document.addEventListener('mousedown', e => {
  if (!player.locked || !targetBlock) return;
  if (e.button === 0) {
    // break
    world.set(targetBlock.x, targetBlock.y, targetBlock.z, 0);
  } else if (e.button === 2) {
    // place adjacent
    const nx = targetBlock.x + targetBlock.normal.x;
    const ny = targetBlock.y + targetBlock.normal.y;
    const nz = targetBlock.z + targetBlock.normal.z;
    // don't place inside player
    const pp = player.position;
    if (Math.abs(nx + 0.5 - pp.x) < 0.7 && Math.abs(nz + 0.5 - pp.z) < 0.7 && ny < pp.y && ny + 1 > pp.y - 1.7) return;
    const name = BLOCK_LIST[selected];
    world.set(nx, ny, nz, BLOCKS[name].id);
  }
});
document.addEventListener('contextmenu', e => e.preventDefault());

// Targeting
function updateTarget() {
  raycaster.setFromCamera(mouse, camera);
  // check blocks in front
  const origin = camera.position.clone();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  let hit = null;
  let prev = null;
  for (let t = 0; t < 6; t += 0.1) {
    const p = origin.clone().addScaledVector(dir, t);
    const bx = Math.floor(p.x);
    const by = Math.floor(p.y);
    const bz = Math.floor(p.z);
    if (world.isSolid(bx, by, bz)) {
      hit = { x: bx, y: by, z: bz };
      // approximate face from previous empty cell
      if (prev) {
        hit.normal = {
          x: prev.x - bx,
          y: prev.y - by,
          z: prev.z - bz,
        };
      } else {
        hit.normal = { x: 0, y: 1, z: 0 };
      }
      break;
    }
    prev = { x: bx, y: by, z: bz };
  }
  targetBlock = hit;
  if (hit) {
    highlight.visible = true;
    highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  } else {
    highlight.visible = false;
  }
}

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Loop
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
