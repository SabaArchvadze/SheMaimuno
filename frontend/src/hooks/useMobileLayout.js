import { useEffect, useState } from 'react';

const MOBILE_MQ = '(max-width: 900px)';
const LANDSCAPE_PHONE_MQ = '(max-width: 950px) and (orientation: landscape)';

export function useMobileLayout() {
  const [layout, setLayout] = useState({
    isMobile: false,
    isPortrait: false,
    isLandscapePhone: false,
  });

  useEffect(() => {
    const mobileMq = window.matchMedia(MOBILE_MQ);
    const portraitMq = window.matchMedia('(orientation: portrait)');
    const landscapePhoneMq = window.matchMedia(LANDSCAPE_PHONE_MQ);

    const sync = () => {
      setLayout({
        isMobile: mobileMq.matches,
        isPortrait: portraitMq.matches,
        isLandscapePhone: landscapePhoneMq.matches,
      });
    };

    sync();
    mobileMq.addEventListener('change', sync);
    portraitMq.addEventListener('change', sync);
    landscapePhoneMq.addEventListener('change', sync);
    window.addEventListener('resize', sync);

    return () => {
      mobileMq.removeEventListener('change', sync);
      portraitMq.removeEventListener('change', sync);
      landscapePhoneMq.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);

  return layout;
}

/** Gameplay views that need landscape on mobile */
export const GAMEPLAY_VIEWS = new Set(['LOBBY', 'GAME', 'WAITING', 'VOTING', 'RESULT']);
