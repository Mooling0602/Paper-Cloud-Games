import { el, paperButton } from './paper';
import { i18n } from '../../../Core/i18n/LanguageManager';

export interface MenuCallbacks {
  onStart: () => void;
  /** Local game save exists. */
  onResume?: () => void;
  /** Online host save exists. */
  onResumeOnline?: () => void;
  /** Enter the online setup page. */
  onOnlinePlay: () => void;
}

export interface MenuView {
  view: HTMLElement;
  destroy: () => void;
}

export function createMenu(cb: MenuCallbacks): MenuView {
  const t = (key: string) => i18n.t(key);

  const view = el('div', 'view');
  view.append(el('div', 'paper-bg'));
  const title = el('div', 'menu-title', 'Roll-and-Move');
  const subtitle = el('div', 'menu-subtitle', t('menu.subtitle'));
  subtitle.dataset.i18n = 'menu.subtitle';

  const actions = el('div', 'menu-actions');
  const startBtn = paperButton(t('menu.start'), cb.onStart, 'menu-start');
  startBtn.dataset.i18n = 'menu.start';
  const resumeBtn = paperButton(t('menu.resume'), () => cb.onResume?.(), 'menu-start');
  resumeBtn.dataset.i18n = 'menu.resume';
  if (!cb.onResume) resumeBtn.hidden = true;
  const resumeOnlineBtn = paperButton(t('menu.resumeOnline'), () => cb.onResumeOnline?.(), 'menu-start');
  resumeOnlineBtn.dataset.i18n = 'menu.resumeOnline';
  if (!cb.onResumeOnline) resumeOnlineBtn.hidden = true;
  const onlinePlayBtn = paperButton(t('menu.onlinePlay'), cb.onOnlinePlay, 'menu-start');
  onlinePlayBtn.dataset.i18n = 'menu.onlinePlay';
  const langBtn = paperButton(t('menu.lang'), () => {
    i18n.setLang(i18n.current === 'zh-CN' ? 'en' : 'zh-CN');
  });
  langBtn.dataset.i18n = 'menu.lang';
  actions.append(startBtn, resumeBtn, resumeOnlineBtn, onlinePlayBtn, langBtn);

  view.append(title, subtitle, actions);

  const credit = el('div', 'menu-credit');
  const gameLink = el('a', 'credit-link', t('menu.creditGame'));
  gameLink.href = 'https://github.com/Mooling0602/Paper-Cloud-Games';
  gameLink.target = '_blank';
  gameLink.rel = 'noopener';
  gameLink.dataset.i18n = 'menu.creditGame';
  const studioLink = el('a', 'credit-link', t('menu.creditStudio'));
  studioLink.href = 'https://github.com/Mooling0602';
  studioLink.target = '_blank';
  studioLink.rel = 'noopener';
  studioLink.dataset.i18n = 'menu.creditStudio';
  credit.append(gameLink, document.createTextNode(' · '), studioLink);
  view.append(credit);

  const menu: MenuView = {
    view,
    destroy: () => {
      unsub();
      view.remove();
    },
  };

  const refresh = () => {
    view.querySelectorAll<HTMLElement>('[data-i18n]').forEach((n) => {
      const key = n.dataset.i18n;
      if (key) n.textContent = t(key);
    });
  };
  const unsub = i18n.onChanged(refresh);

  return menu;
}
