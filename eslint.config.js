// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions is Deno code (npm: specifiers, Deno globals); it isn't part of the app bundle.
    ignores: ['dist/*', 'supabase/functions/*', 'supabase/.temp/*'],
  },
]);
