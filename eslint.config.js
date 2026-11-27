// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Android keyboards differ per phone (some resize the window, some do not); the built-in
      // KeyboardAvoidingView double-shifts or under-shifts. keyboard-controller measures the real keyboard.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['KeyboardAvoidingView'],
              message: "Import KeyboardAvoidingView from 'react-native-keyboard-controller' instead.",
            },
          ],
        },
      ],
    },
  },
]);
