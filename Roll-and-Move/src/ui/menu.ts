import { el, paperButton } from './paper';
import type { LangCode } from '../../../Core/i18n/LanguageManager';
import { i18n } from '../../../Core/i18n/LanguageManager';

export interface MenuView {
  view: HTMLElement;
  destroy: () => void;
}

export function createMenu(onStart: () => void, onResume?: () => void): MenuView {
  const t = (key: string) => i18n.t(key);

  const view = el('div', 'view');
  view.append(el('div', 'paper-bg'));
  const title = el('div', 'menu-title', 'Roll-and-Move');
  const subtitle = el('div', 'menu-subtitle', t('menu.subtitle'));
  subtitle.dataset.i18n = 'menu.subtitle';

  const actions = el('div', 'menu-actions');
  const startBtn = paperButton(t('menu.start'), onStart, 'menu-start');
  startBtn.dataset.i18n = 'menu.start';
  const resumeBtn = paperButton(t('menu.resume'), () => onResume?.(), 'menu-start');
  resumeBtn.dataset.i18n = 'menu.resume';
  if (!onResume) resumeBtn.hidden = true;
  const langBtn = paperButton(t('menu.lang'), () => {
    i18n.setLang(i18n.current === 'zh-CN' ? 'en' : 'zh-CN');
  });
  langBtn.dataset.i18n = 'menu.lang';
  actions.append(startBtn, resumeBtn, langBtn);

  const credit = el('div', 'menu-credit', t('menu.credit'));
  credit.dataset.i18n = 'menu.credit';

  view.append(title, subtitle, actions, credit);

  const menu: MenuView = {
    view,
    destroy: () => unsub(),
  };

  // re-render translated nodes on language change
  const refresh = () => {
    view.querySelectorAll<HTMLElement>('[data-i18n]').forEach((n) => {
      const key = n.dataset.i18n;
      if (key) n.textContent = t(key);
    });
  };
  const unsub = i18n.onChanged(refresh);

  return menu;
}
