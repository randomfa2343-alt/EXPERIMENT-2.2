import * as THREE from 'three';
import { BLOCKS, getBlockById } from './blocks.js';

const SIZE = 48;      // world width/depth in blocks
const MAX_H = 24;     // max height

export class World {
  constructor(scene) {
    this.scene = scene;
    this.data = new Map(); // key "x,y,z" -> block id
    this.meshes = new Map(); // key -> Mesh
    this.group = new THREE.Group();
    scene.add(this.group);
    this.geo = new THREE.BoxGeometry(1, 1, 1);
    this.materials = {};
    for (const [name, def] of Object.entries(BLOCKS)) {
      if (def.color != null) {
        this.materials[def.id] = new THREE.MeshLambertMaterial({
          color: def.color,
          transparent: name === 'water' || name === 'leaves',
          opacity: name === 'water' ? 0.7 : name === 'leaves' ? 0.9 : 1,
        });
      }
    }
  }

  key(x, y, z) { return `${x|0},${y|0},${z|0}`; }

  get(x, y, z) {
    const id = this.data.get(this.key(x, y, z));
    return id === undefined ? 0 : id;
  }

  set(x, y, z, id) {
    const k = this.key(x, y, z);
    const old = this.data.get(k);
    if (old === id) return;
    if (id === 0) {
      this.data.delete(k);
      this.removeMesh(k);
    } else {
      this.data.set(k, id);
      this.updateMesh(x, y, z, id);
    }
  }

  isSolid(x, y, z) {
    const b = getBlockById(this.get(x, y, z));
    return b.solid;
  }

  removeMesh(k) {
    const m = this.meshes.get(k);
    if (m) {
      this.group.remove(m);
      this.meshes.delete(k);
    }
  }

  updateMesh(x, y, z, id) {
    const k = this.key(x, y, z);
    this.removeMesh(k);
    const mat = this.materials[id];
    if (!mat) return;
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.meshes.set(k, mesh);
  }

  // Simple value noise
  noise(x, z) {
    const n = Math.sin(x * 0.15) * Math.cos(z * 0.13) * 4
            + Math.sin(x * 0.07 + 1.3) * Math.cos(z * 0.09) * 2.5
            + Math.sin(x * 0.31) * 1.2;
    return n;
  }

  generate() {
    const half = SIZE / 2;
    for (let x = -half; x < half; x++) {
      for (let z = -half; z < half; z++) {
        const h = Math.floor(8 + this.noise(x, z));
        const clamped = Math.max(1, Math.min(MAX_H - 2, h));

        for (let y = 0; y <= clamped; y++) {
          let id;
          if (y === clamped) id = BLOCKS.grass.id;
          else if (y >= clamped - 3) id = BLOCKS.dirt.id;
          else id = BLOCKS.stone.id;
          // sand near lower areas
          if (clamped < 7 && y === clamped) id = BLOCKS.sand.id;
          this.set(x, y, z, id);
        }

        // simple trees
        if (clamped > 8 && Math.random() < 0.012) {
          const tx = x, tz = z, ty = clamped + 1;
          for (let i = 0; i < 4; i++) this.set(tx, ty + i, tz, BLOCKS.wood.id);
          for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
              for (let ly = 3; ly <= 5; ly++) {
                if (Math.abs(lx) + Math.abs(lz) + (ly === 5 ? 1 : 0) < 4) {
                  if (this.get(tx + lx, ty + ly, tz + lz) === 0) {
                    this.set(tx + lx, ty + ly, tz + lz, BLOCKS.leaves.id);
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  // Find spawn height
  getSpawnY(x, z) {
    for (let y = MAX_H; y >= 0; y--) {
      if (this.isSolid(x, y, z)) return y + 1;
    }
    return 12;
  }
}
