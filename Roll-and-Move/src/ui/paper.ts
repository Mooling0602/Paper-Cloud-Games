import { PAPER } from '../../../Core/style/paper';

/** Small typed DOM helper. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Paper-styled button (native element, hand-drawn look via CSS). */
export function paperButton(label: string, onClick: () => void, extraCls = ''): HTMLButtonElement {
  const btn = el('button', `paper-btn${extraCls ? ' ' + extraCls : ''}`, label);
  btn.type = 'button';
  btn.addEventListener('click', onClick);
  return btn;
}

/** Text element carrying an i18n key for re-translation. */
export function i18nText(key: string): HTMLSpanElement {
  const span = el('span', 'i18n');
  span.dataset.i18n = key;
  return span;
}

/** Re-translate every [data-i18n] node using the given resolver. */
export function refreshI18n(root: ParentNode, t: (key: string) => string): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (key) node.textContent = t(key);
  });
}

/** i18n key + {vars} substitute: rendered as a single text node. */
export function i18nTextVars(key: string, vars: Record<string, string | number>): HTMLSpanElement {
  const span = el('span', 'i18n');
  span.dataset.i18n = key;
  span.dataset.vars = JSON.stringify(vars);
  return span;
}

export function resolveVars(t: (key: string, vars?: Record<string, string | number>) => string, root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (!key) return;
    const vars = node.dataset.vars ? (JSON.parse(node.dataset.vars) as Record<string, string | number>) : undefined;
    node.textContent = t(key, vars);
  });
}
