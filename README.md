# Cubara — Voxel Sandbox

A browser-based voxel building game. Original branding and assets.

## Play

**https://randomfa2343-alt.github.io/EXPERIMENT-2.2/**

Or locally (ES modules need a server):

```bash
npx serve .
# then open the URL it prints
```

## Controls

| Action | Input |
|--------|--------|
| Move | WASD |
| Look | Mouse |
| Jump | Space |
| Break | Left click |
| Place | Right click |
| Select block | 1–8 or scroll |
| Lock pointer | Click the page |

## Performance notes

The first version created **one Three.js Mesh per block** (~15–25k meshes) and enabled shadows on all of them, which caused heavy lag.

**Optimizations applied:**

1. **Batched face-culled geometry** — only exposed faces are built; one `BufferGeometry` + `Mesh` per block type (≈8 draw calls instead of thousands).
2. **No per-block meshes** — buried blocks never generate geometry.
3. **Shadows disabled** — directional + ambient light only.
4. **Pixel ratio capped** at 1.5.
5. **Antialiasing off** for GPU savings.
6. **Reused vectors** in movement and block targeting (no per-frame `new THREE.Vector3()`).
7. **Deferred mesh rebuild** — break/place queues a single rebuild on the next frame.

Break and place still work; the world mesh rebuilds after each edit.

World size is 48×48 blocks. Further gains would come from chunking or instancing for larger maps.

## Project structure

```
index.html
css/style.css
js/main.js      — render loop, input, targeting
js/world.js     — data + batched mesh builder
js/player.js    — movement & collision
js/blocks.js    — block type definitions
README.md
```

## Tech

- Three.js r160 (ES modules via CDN)
- No build step
