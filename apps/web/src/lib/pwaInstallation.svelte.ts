import { browser } from '$app/environment';
import { m } from '$lib/paraglide/messages';
import Bowser from 'bowser';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed'; }>;
}

export interface PwaInstallGuide {
  description: string;
  steps: string[];
}

const STANDALONE_DISPLAY_MODES = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'];

const SMARTPHONE_OS_NAMES = ['Android', 'Windows Phone', 'KaiOS'];

// iPadOS 13 以降は macOS として報告されるため、タッチ操作の有無で判定する。
const isIosOs = (osName: string) => osName === 'iOS' || (osName === 'macOS' && navigator.maxTouchPoints > 1);

const isSmartphoneOs = (parser: ReturnType<typeof Bowser.getParser>) => {
  const osName = parser.getOSName();
  return isIosOs(osName) || SMARTPHONE_OS_NAMES.includes(osName);
};

const detectGuide = (): PwaInstallGuide => {
  const parser = Bowser.getParser(navigator.userAgent);
  const osName = parser.getOSName();
  const browserName = parser.getBrowserName();
  const isIos = isIosOs(osName);

  if (isIos) {
    if (browserName === 'Safari') {
      return {
        description: m.pwa_guide_safari_description(),
        steps: [
          m.pwa_guide_safari_step1(),
          m.pwa_guide_safari_step2(),
          m.pwa_guide_safari_step3(),
        ],
      };
    }
    return {
      description: m.pwa_guide_ios_description(),
      steps: [
        m.pwa_guide_ios_step1(),
        m.pwa_guide_ios_step2(),
        m.pwa_guide_ios_step3(),
      ],
    };
  }

  if (osName === 'Android') {
    if (browserName === 'Samsung Internet for Android') {
      return {
        description: m.pwa_guide_samsung_description(),
        steps: [
          m.pwa_guide_samsung_step1(),
          m.pwa_guide_samsung_step2(),
        ],
      };
    }
    return {
      description: m.pwa_guide_android_description(),
      steps: [
        m.pwa_guide_android_step1(),
        m.pwa_guide_android_step2(),
        m.pwa_guide_android_step3(),
      ],
    };
  }

  if (osName === 'macOS' && browserName === 'Safari') {
    return {
      description: m.pwa_guide_macos_description(),
      steps: [
        m.pwa_guide_macos_step1(),
        m.pwa_guide_macos_step2(),
        m.pwa_guide_macos_step3(),
      ],
    };
  }

  if (parser.getEngineName() === 'Blink') {
    return {
      description: m.pwa_guide_chromium_description(),
      steps: [
        m.pwa_guide_chromium_step1(),
        m.pwa_guide_chromium_step2(),
      ],
    };
  }

  return {
    description: m.pwa_guide_unsupported_description(),
    steps: [],
  };
};

class PwaInstallation {
  standalone = $state(false);
  smartphone = $state(false);
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

    this.smartphone = isSmartphoneOs(Bowser.getParser(navigator.userAgent));
    this.guide = detectGuide();
  }

  get canInstall() {
    return this.#deferredPrompt !== undefined;
  }

  get requiresInstallation() {
    return this.smartphone && !this.standalone;
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
