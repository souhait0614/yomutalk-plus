import { browser } from '$app/environment';
import Bowser from 'bowser';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed'; }>;
}

export interface PwaInstallGuide {
  description: string;
  steps: string[];
}

const STANDALONE_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];

const detectGuide = (): PwaInstallGuide => {
  const parser = Bowser.getParser(navigator.userAgent);
  const osName = parser.getOSName();
  const browserName = parser.getBrowserName();
  const isIos = osName === 'iOS' || (osName === 'macOS' && navigator.maxTouchPoints > 1);

  if (isIos) {
    if (browserName === 'Safari') {
      return {
        description: 'Safari からホーム画面に追加できます。',
        steps: [
          '共有ボタン(アドレスバー横の「…」メニュー内にある場合もあります)をタップします。',
          '「ホーム画面に追加」をタップします(見つからない場合は「さらに表示」から探してください)。',
          '「Web アプリとして開く」がある場合はオンにして、「追加」をタップします。',
        ],
      };
    }
    return {
      description: 'iOS / iPadOS 16.4 以降では、Safari 以外のブラウザからもホーム画面に追加できます。うまくいかない場合は Safari で開いてください。',
      steps: [
        'アドレスバー付近またはメニュー内の共有ボタンをタップします。',
        '「ホーム画面に追加」をタップします(見つからない場合は「さらに表示」から探してください)。',
        '「追加」をタップします。',
      ],
    };
  }

  if (osName === 'Android') {
    if (browserName === 'Samsung Internet for Android') {
      return {
        description: 'Samsung Internet からホーム画面に追加できます。',
        steps: [
          '画面下部のメニューボタン(≡)をタップします。',
          '「ページを追加」をタップし、「ホーム画面」を選択します。',
        ],
      };
    }
    return {
      description: 'ブラウザのメニューからホーム画面に追加できます。',
      steps: [
        '画面右上(または右下)のメニューボタン(⋮)をタップします。',
        '「アプリをインストール」または「ホーム画面に追加」をタップします。',
        '確認画面で「インストール」または「追加」をタップします。',
      ],
    };
  }

  if (osName === 'macOS' && browserName === 'Safari') {
    return {
      description: 'macOS Sonoma 以降の Safari では Dock に追加できます。',
      steps: [
        'メニューバーの「ファイル」をクリックします(ツールバーの共有ボタンからも操作できます)。',
        '「Dock に追加」をクリックします。',
        '「追加」をクリックします。',
      ],
    };
  }

  if (parser.getEngineName() === 'Blink') {
    return {
      description: 'ブラウザのメニューからアプリとしてインストールできます。',
      steps: [
        'アドレスバー右端のインストールアイコンをクリックします。',
        '見つからない場合は、ブラウザのメニューから「アプリをインストール」や「このサイトをアプリとしてインストール」などの項目を探してください。',
      ],
    };
  }

  return {
    description: 'このブラウザはアプリとしてのインストールに対応していません。Chrome や Microsoft Edge、Safari をご利用ください。',
    steps: [],
  };
};

class PwaInstallation {
  standalone = $state(false);
  #deferredPrompt = $state<BeforeInstallPromptEvent>();
  guideOpen = $state(false);
  guide = $state<PwaInstallGuide>({ description: '', steps: [] });

  constructor() {
    if (!browser) return;

    const queries = STANDALONE_DISPLAY_MODES.map((mode) => window.matchMedia(`(display-mode: ${mode})`));
    const updateStandalone = () => {
      this.standalone = queries.some((query) => query.matches)
        || (navigator as Navigator & { standalone?: boolean; }).standalone === true;
    };
    updateStandalone();
    for (const query of queries) query.addEventListener('change', updateStandalone);

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.#deferredPrompt = event as BeforeInstallPromptEvent;
    });
    window.addEventListener('appinstalled', () => {
      this.#deferredPrompt = undefined;
    });

    this.guide = detectGuide();
  }

  async install() {
    const deferredPrompt = this.#deferredPrompt;
    if (!deferredPrompt) {
      this.guideOpen = true;
      return;
    }
    this.#deferredPrompt = undefined;
    await deferredPrompt.prompt();
  }
}

export const pwaInstallation = new PwaInstallation();
