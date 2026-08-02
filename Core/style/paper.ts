/** Paper design style theme (brand core): colors and fonts shared across games. */

export const PAPER = {
  /** Hex numbers for Phaser Graphics fill/stroke styles. */
  base: 0xf6f1e5, // paper white
  alt: 0xefe7d5, // darker paper (cells)
  ink: 0x3b372e, // ink lines
  inkSoft: 0x8a8374, // faint pencil
  red: 0xc94f4f,
  blue: 0x4f7ac9,
  green: 0x7fa36b,
  yellow: 0xd9b64a,
  redSoft: 0xeccaca,
  blueSoft: 0xcad4ec,
  /** CSS color strings for Phaser Text styles. */
  baseCss: '#f6f1e5',
  altCss: '#efe7d5',
  inkCss: '#3b372e',
  inkSoftCss: '#8a8374',
  redCss: '#c94f4f',
  blueCss: '#4f7ac9',
};

export const FONTS = {
  /** Chinese first (LXGW WenKai covers Latin too), English hand-drawn as accent. */
  family: '"LXGW WenKai", "Patrick Hand", "KaiTi", "Kaiti SC", cursive',
  heading: '"Patrick Hand", "LXGW WenKai", cursive',
};
