// Block definitions — original colorful low-poly palette
export const BLOCKS = {
  air:   { id: 0, name: 'Air',   color: null, solid: false },
  grass: { id: 1, name: 'Grass', color: 0x5aad3e, solid: true },
  dirt:  { id: 2, name: 'Dirt',  color: 0x8b5e3c, solid: true },
  stone: { id: 3, name: 'Stone', color: 0x7a7d85, solid: true },
  sand:  { id: 4, name: 'Sand',  color: 0xe8d59a, solid: true },
  wood:  { id: 5, name: 'Wood',  color: 0x9c6b3c, solid: true },
  leaves:{ id: 6, name: 'Leaves',color: 0x3d8c40, solid: true },
  water: { id: 7, name: 'Water', color: 0x3a9bdc, solid: false },
  brick: { id: 8, name: 'Brick', color: 0xb54a3c, solid: true },
};

export const BLOCK_LIST = ['grass','dirt','stone','sand','wood','leaves','brick','water'];

export function getBlockById(id) {
  return Object.values(BLOCKS).find(b => b.id === id) || BLOCKS.air;
}
