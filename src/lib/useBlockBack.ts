import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Swallow the Android hardware back button on in-game screens. One accidental
 * press mid-deal or mid-reveal would otherwise drop the table out of the game;
 * each screen has an explicit Quit instead. (iOS swipe-back is disabled in _layout.)
 */
export function useBlockBack() {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);
}
