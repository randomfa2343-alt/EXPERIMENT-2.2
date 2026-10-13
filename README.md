# Cubara — Voxel Sandbox

A browser-based voxel building game inspired by block-building sandboxes.
Original branding and assets — no copyrighted material from other games.

## Play

Open **https://randomfa2343-alt.github.io/EXPERIMENT-2.2/**  
or open `index.html` in a modern browser (Chrome, Firefox, Edge).

> **Note:** Requires a local server or GitHub Pages for ES modules.  
> If opening as a file, use a simple static server:
> ```bash
> npx serve .
> ```

## Controls

| Action | Input |
|--------|--------|
| Move | WASD |
| Look | Mouse |
| Jump | Space |
| Break block | Left click |
| Place block | Right click |
| Select block | 1–8 or mouse wheel |
| Lock pointer | Click the page |

## Features

- First-person 3D voxel world
- Procedural terrain (grass, dirt, stone, sand, trees)
- Break and place blocks
- Hotbar with 8 block types
- Collision detection
- Block targeting highlight + crosshair
- Colorful low-poly style

## Tech

- Three.js (WebGL)
- Vanilla ES modules
- No build step required

## Project structure

```
index.html
css/style.css
js/
  main.js      — entry, render loop, input
  world.js     — terrain generation & block storage
  player.js    — movement, physics, controls
  blocks.js    — block type definitions
README.md
```

## License

Original work for Experiment 2.2. Free to use and modify.
