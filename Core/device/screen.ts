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

/**
 * Height of the area reserved by the system status bar (CSS px).
 * On edge-to-edge Android the page extends under the bar but the bar is
 * opaque; layouts must offset their top content by this amount.
 */
export function safeAreaTop(): number {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const v = probe.offsetHeight - probe.clientHeight;
  probe.remove();
  return v || 0;
}
