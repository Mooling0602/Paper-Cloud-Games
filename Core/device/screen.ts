export interface Viewport {
  width: number;
  height: number;
}

/** Minimum supported screen size (CSS pixels). Smaller screens are blocked entirely. */
export const SMALL_SCREEN_MIN = { width: 768, height: 600 };

export function getViewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** True when the viewport is too small to play (phones, etc.). */
export function isSmallScreen(vp: Viewport = getViewport()): boolean {
  return vp.width < SMALL_SCREEN_MIN.width || vp.height < SMALL_SCREEN_MIN.height;
}
