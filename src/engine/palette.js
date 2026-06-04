// Cohesive pixel-art palette + colour helpers used by every sprite.
// Keeps all generated art on a unified, readable colour scheme.

export const P = {
  // ink / outline / neutrals
  ink:    '#10121f',
  ink2:   '#1b1e33',
  shadow: '#0b0d1a',
  white:  '#f4f4f8',
  bone:   '#e6dcc0',
  gray1:  '#3a3f5c',
  gray2:  '#5a6188',
  gray3:  '#8a91b4',
  gray4:  '#b9c0dc',

  // skin tones
  skin:   '#f0c090',
  skinD:  '#c98b5e',
  skin2:  '#e0a878',

  // reds / blood / flame
  red:    '#e2474c',
  redD:   '#a52833',
  redL:   '#ff7b6b',
  blood:  '#7a1f2b',
  ember:  '#ff9b3d',
  emberL: '#ffd479',

  // oranges / wood / leather
  wood:   '#7c4a2d',
  woodD:  '#54301c',
  woodL:  '#a9703f',
  leather:'#8a5a3a',

  // greens (slime, nature, poison)
  green:  '#5bbf57',
  greenD: '#2f8f4e',
  greenL: '#9be36b',
  poison: '#a6e22e',
  poisonD:'#5d8a1a',
  toxic:  '#7ee787',

  // blues / ice / water / magic
  blue:   '#3f7bdc',
  blueD:  '#274690',
  blueL:  '#6fb8ff',
  ice:    '#aee9ff',
  iceD:   '#5fb3d6',
  mana:   '#7a6bff',
  manaL:  '#b4a8ff',

  // purples (void, magic, royalty)
  purple: '#8a4fbf',
  purpleD:'#522a85',
  purpleL:'#c79bff',
  void:   '#2a1a4a',

  // metals
  steel:  '#9aa4c8',
  steelD: '#5b6488',
  steelL: '#d6def0',
  iron:   '#6b7390',
  gold:   '#ffcf4d',
  goldD:  '#c98f1e',
  goldL:  '#ffe9a0',
  bronze: '#c8843c',

  // crystal / shard (the meta currency vibe)
  shard:  '#48e0d0',
  shardD: '#1f9a92',
  shardL: '#a8fff4',

  // dungeon floor / wall tones
  floor:  '#23263f',
  floor2: '#2b2f4d',
  floorLine: '#191b2e',
  wall:   '#3d4570',
  wallD:  '#2a3052',
  wallL:  '#56609a',
};

const hex = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const toHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

export function lighten(h, amt = 0.2) {
  const [r, g, b] = hex(h);
  return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}
export function darken(h, amt = 0.2) {
  const [r, g, b] = hex(h);
  return toHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
}
export function mix(h1, h2, t = 0.5) {
  const a = hex(h1), b = hex(h2);
  return toHex(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
}
export function withAlpha(h, a) {
  const [r, g, b] = hex(h);
  return `rgba(${r},${g},${b},${a})`;
}
