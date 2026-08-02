/** Fullscreen helpers (reusable across games). Chrome/Android supported. */

export function isFullscreen(): boolean {
  return !!document.fullscreenElement;
}

export function enterFullscreen(): Promise<void> {
  const el = document.documentElement;
  if (el.requestFullscreen) return el.requestFullscreen({ navigationUI: 'hide' });
  return Promise.resolve();
}

export function exitFullscreen(): void {
  if (document.fullscreenElement && document.exitFullscreen) void document.exitFullscreen();
}

export function toggleFullscreen(): void {
  if (isFullscreen()) exitFullscreen();
  else void enterFullscreen();
}
