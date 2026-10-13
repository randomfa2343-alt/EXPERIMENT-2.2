import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const SPEED = 6;
const JUMP = 8.5;
const GRAVITY = 22;
const PLAYER_H = 1.7;
const PLAYER_W = 0.4;

export class Player {
  constructor(camera, dom, world) {
    this.camera = camera;
    this.world = world;
    this.controls = new PointerLockControls(camera, dom);
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3(0, 1, 0);
    this.onGround = false;
    this.keys = {};

    document.addEventListener('keydown', e => { this.keys[e.code] = true; });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  get position() { return this.controls.getObject().position; }

  lock() { this.controls.lock(); }
  get locked() { return this.controls.isLocked; }

  update(dt) {
    if (!this.controls.isLocked) return;

    this.direction.set(0, 0, 0);
    if (this.keys['KeyW']) this.direction.z -= 1;
    if (this.keys['KeyS']) this.direction.z += 1;
    if (this.keys['KeyA']) this.direction.x -= 1;
    if (this.keys['KeyD']) this.direction.x += 1;
    if (this.direction.x !== 0 || this.direction.z !== 0) this.direction.normalize();

    // Reuse vectors — no per-frame allocation
    this.camera.getWorldDirection(this._forward);
    this._forward.y = 0;
    this._forward.normalize();
    this._right.crossVectors(this._forward, this._up).normalize();

    this.velocity.x = (-this.direction.z * this._forward.x + this.direction.x * this._right.x) * SPEED;
    this.velocity.z = (-this.direction.z * this._forward.z + this.direction.x * this._right.z) * SPEED;

    if (this.onGround && this.keys['Space']) {
      this.velocity.y = JUMP;
      this.onGround = false;
    }
    this.velocity.y -= GRAVITY * dt;

    const pos = this.position;
    const dx = this.velocity.x * dt;
    const dy = this.velocity.y * dt;
    const dz = this.velocity.z * dt;

    if (!this.collides(pos.x + dx, pos.y, pos.z)) pos.x += dx;
    else this.velocity.x = 0;

    if (!this.collides(pos.x, pos.y, pos.z + dz)) pos.z += dz;
    else this.velocity.z = 0;

    if (!this.collides(pos.x, pos.y + dy, pos.z)) {
      pos.y += dy;
      this.onGround = false;
    } else {
      if (this.velocity.y < 0) this.onGround = true;
      this.velocity.y = 0;
    }

    if (pos.y < -10) {
      pos.y = this.world.getSpawnY(0, 0) + 1;
      this.velocity.set(0, 0, 0);
    }
  }

  collides(x, y, z) {
    const minX = Math.floor(x - PLAYER_W);
    const maxX = Math.floor(x + PLAYER_W);
    const minY = Math.floor(y - PLAYER_H);
    const maxY = Math.floor(y - 0.1);
    const minZ = Math.floor(z - PLAYER_W);
    const maxZ = Math.floor(z + PLAYER_W);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (this.world.isSolid(bx, by, bz)) return true;
        }
      }
    }
    return false;
  }
}
