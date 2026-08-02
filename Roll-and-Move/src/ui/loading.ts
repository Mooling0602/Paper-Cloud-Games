import { el, paperButton } from './paper';
import type { LangCode } from '../../../Core/i18n/LanguageManager';

export interface LoadingView {
  view: HTMLElement;
  /** Resolves once fonts (incl. Chinese subset) are ready. */
  ready: Promise<void>;
}

const ZH_SAMPLE =
  '加载中…开始游戏纸面风格桌游纸云游戏·木泠工作室的回合点击骰子掷骰重投（剩次）走棋掷出点剩余重投次数获胜！再来一局第格起点终点屏幕尺寸过小需要更大的屏幕（平板或电脑）。请在平板或电脑上打开本游戏。当前尺寸：×';

export function createLoading(t: (key: string) => string): LoadingView {
  const view = el('div', 'view');
  view.append(el('div', 'paper-bg'));
  const title = el('div', 'loading-title', 'Roll-and-Move');
  const bar = el('div', 'loading-bar');
  const fill = el('div', 'loading-fill');
  bar.append(fill);
  const text = el('div', 'loading-text', t('loading.text'));
  view.append(title, bar, text);

  let progress = 0;
  const ready = (async () => {
    // force the chinese-simplified webfont subset to download
    await Promise.all([
      document.fonts.load('16px "LXGW WenKai"', ZH_SAMPLE),
      document.fonts.load('16px "Patrick Hand"', 'Roll-and-Move Loading... Start Game EN'),
    ]).catch(() => undefined);
    // finish the progress bar animation
    progress = 100;
    fill.style.width = '100%';
    await new Promise((r) => setTimeout(r, 350));
  })();

  const timer = setInterval(() => {
    if (progress >= 100) {
      clearInterval(timer);
      return;
    }
    progress = Math.min(progress + 12, 96);
    fill.style.width = `${progress}%`;
  }, 120);

  return { view, ready };
}
