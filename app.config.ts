import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the config. This only adds a base path when one is set, so the
// GitHub Pages build can live under /imposter while local dev stays at the root.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
