module.exports = ({ config }) => {
  const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
  const existingPlugins = Array.isArray(config.plugins) ? config.plugins : [];
  const pluginsWithoutGoogleSignIn = existingPlugins.filter((plugin) => {
    if (typeof plugin === 'string') {
      return plugin !== '@react-native-google-signin/google-signin';
    }

    return plugin?.[0] !== '@react-native-google-signin/google-signin';
  });

  const requestedPlugins = [
    "expo-font",
    "expo-image",
    "expo-sqlite",
    "expo-web-browser"
  ];

  requestedPlugins.forEach((plugin) => {
    if (!pluginsWithoutGoogleSignIn.includes(plugin)) {
      pluginsWithoutGoogleSignIn.push(plugin);
    }
  });

  if (googleIosUrlScheme) {
    pluginsWithoutGoogleSignIn.push([
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: googleIosUrlScheme,
      },
    ]);
  }

  return {
    ...config,
    plugins: pluginsWithoutGoogleSignIn,
  };
};
