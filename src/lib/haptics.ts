import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Haptics are a nice-to-have: silently skip on web or unsupported devices.
const enabled = Platform.OS !== 'web';

export const tap = () => {
  if (enabled) Haptics.selectionAsync().catch(() => {});
};

export const thud = () => {
  if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
};

export const success = () => {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
