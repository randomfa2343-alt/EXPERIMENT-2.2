import * as THREE from 'three';
import { BLOCKS, getBlockById } from './blocks.js';

const SIZE = 48;
const MAX_H = 24;

// Face directions: [dx, dy, dz, vertices for unit face at origin]
const FACES = [
  { d: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] }, // +X
  { d: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] }, // -X
  { d: [0, 1, 0], corners: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]] }, // +Y
  { d: [0, -1, 0], corners: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]] }, // -Y
  { d: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] }, // +Z
  { d: [0, 0, -1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] }, // -Z
];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.data = new Map();
    this.group = new THREE.Group();
    scene.add(this.group);

    this.materials = {};
    this.meshes = {}; // blockId -> Mesh (batched)

    for (const [name, def] of Object.entries(BLOCKS)) {
      if (def.color == null) continue;
      const mat = new THREE.MeshLambertMaterial({
        color: def.color,
        transparent: name === 'water' || name === 'leaves',
        opacity: name === 'water' ? 0.65 : name === 'leaves' ? 0.85 : 1,
        side: name === 'leaves' ? THREE.DoubleSide : THREE.FrontSide,
      });
      this.materials[def.id] = mat;
    }

    this._rebuildQueued = false;
  }

  key(x, y, z) {
    return (x | 0) + ',' + (y | 0) + ',' + (z | 0);
  }

  get(x, y, z) {
    const id = this.data.get(this.key(x, y, z));
    return id === undefined ? 0 : id;
  }

  isSolid(x, y, z) {
    return getBlockById(this.get(x, y, z)).solid;
  }

  set(x, y, z, id) {
    const k = this.key(x, y, z);
    const old = this.data.get(k);
    if (old === id) return;
    if (id === 0) this.data.delete(k);
    else this.data.set(k, id);
    this.queueRebuild();
  }

  queueRebuild() {
    if (this._rebuildQueued) return;
    this._rebuildQueued = true;
    // rebuild next frame so multiple edits in one tick only rebuild once
    requestAnimationFrame(() => {
      this._rebuildQueued = false;
      this.rebuildMeshes();
    });
  }

  /**
   * Build one BufferGeometry per block type with only exposed faces.
   * This is the main performance fix: thousands of Mesh → a handful of draw calls.
   */
  rebuildMeshes() {
    // Clear old meshes
    while (this.group.children.length) {
      const m = this.group.children[0];
      this.group.remove(m);
      if (m.geometry) m.geometry.dispose();
    }
    this.meshes = {};

    // Collect vertices/normals/indices per material
    const buckets = {};
    for (const id of Object.keys(this.materials)) {
      buckets[id] = { pos: [], norm: [], idx: [], vcount: 0 };
    }

    for (const [k, id] of this.data) {
      if (!buckets[id]) continue;
      const [x, y, z] = k.split(',').map(Number);
      const bucket = buckets[id];

      for (const face of FACES) {
        const nx = x + face.d[0];
        const ny = y + face.d[1];
        const nz = z + face.d[2];
        // Only draw face if neighbor is empty or non-solid (or transparent leaves/water edge)
        const nid = this.get(nx, ny, nz);
        const neighbor = getBlockById(nid);
        if (neighbor.solid && nid !== 0) continue;
        // skip face between two same transparent blocks? keep simple: show if not solid

        const base = bucket.vcount;
        for (const c of face.corners) {
          bucket.pos.push(x + c[0], y + c[1], z + c[2]);
          bucket.norm.push(face.d[0], face.d[1], face.d[2]);
        }
        // two triangles
        bucket.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        bucket.vcount += 4;
      }
    }

    for (const [id, bucket] of Object.entries(buckets)) {
      if (bucket.vcount === 0) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(bucket.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.norm, 3));
      geo.setIndex(bucket.idx);
      geo.computeBoundingSphere();

      const mesh = new THREE.Mesh(geo, this.materials[id]);
      // no shadows — major win
      this.group.add(mesh);
      this.meshes[id] = mesh;
    }
  }

  noise(x, z) {
    return Math.sin(x * 0.15) * Math.cos(z * 0.13) * 4
         + Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.09) * 2.5
         + Math.sin(x * 0.31) * 1.2;
  }

  generate() {
    // Fill data only — no mesh until the end
    const half = SIZE / 2;
    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        const h = Math.floor(8 + this.noise(x, z));
        const clamped = Math.max(1, Math.min(MAX_H - 2, h));

        for (let y = 0; y <= clamped; y++) {
          let id = BLOCKS.stone.id;
          if (y === clamped) id = clamped < 7 ? BLOCKS.sand.id : BLOCKS.grass.id;
          else if (y >= clamped - 3) id = BLOCKS.dirt.id;
          this.data.set(this.key(x, y, z), id);
        }

        if (clamped > 8 && Math.random() < 0.012) {
          const tx = x, tz = z, ty = clamped + 1;
          for (let i = 0; i < 4; i++) this.data.set(this.key(tx, ty + i, tz), BLOCKS.wood.id);
          for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
              for (let ly = 3; ly <= 5; ly++) {
                if (Math.abs(lx) + Math.abs(lz) + (ly === 5 ? 1 : 0) < 4) {
                  const lk = this.key(tx + lx, ty + ly, tz + lz);
                  if (!this.data.has(lk)) this.data.set(lk, BLOCKS.leaves.id);
                }
              }
            }
          }
        }
      }
    }
    this.rebuildMeshes();
  }

  getSpawnY(x, z) {
    for (let y = MAX_H; y >= 0; y--) {
      if (this.isSolid(x, y, z)) return y + 1;
    }
    return 12;
  }
}
