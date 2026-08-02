/**
 * Dev-only debug reporter: posts diagnostics from the game page to the Vite
 * dev server, which appends them to debug.log (readable by the developer).
 * No-op in production builds.
 */
export function reportDebug(kind: string, data: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  void fetch('/__debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, ...data }),
  }).catch(() => undefined);
}

/** Forward page errors and unhandled rejections to the dev log. */
export function setupErrorReporting(): void {
  if (!import.meta.env.DEV) return;
  window.addEventListener('error', (e) => {
    reportDebug('error', { msg: e.message, src: e.filename, line: e.lineno, col: e.colno });
  });
  window.addEventListener('unhandledrejection', (e) => {
    reportDebug('error', { rejection: String(e.reason) });
  });
}
