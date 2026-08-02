export type LangCode = 'en' | 'zh-CN';
export type Dict = Record<string, unknown>;

export interface DictEntry {
  code: LangCode;
  dict: Dict;
}

/**
 * Minimal bilingual i18n manager. Dictionaries are registered at startup
 * (bundled JSON imports), the current language is detected from the browser
 * and can be toggled at runtime; listeners are notified on change.
 */
export class LanguageManager {
  private dicts = new Map<LangCode, Dict>();
  private listeners = new Set<(lang: LangCode) => void>();
  current: LangCode = 'en';

  register(entry: DictEntry): void {
    this.dicts.set(entry.code, entry.dict);
  }

  detect(): LangCode {
    const langs = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
    return langs.some((l) => l.toLowerCase().startsWith('zh')) ? 'zh-CN' : 'en';
  }

  setLang(code: LangCode): void {
    if (!this.dicts.has(code)) return;
    this.current = code;
    this.listeners.forEach((fn) => fn(code));
  }

  onChanged(fn: (lang: LangCode) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Resolve "menu.start" style keys; substitute {var} placeholders. */
  t(key: string, vars?: Record<string, string | number>): string {
    const dict = this.dicts.get(this.current) ?? this.dicts.get('en');
    const raw = resolveKey(dict, key);
    if (raw == null) return key;
    let s = String(raw);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    }
    return s;
  }
}

function resolveKey(dict: Dict | undefined, key: string): unknown {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

export const i18n = new LanguageManager();
