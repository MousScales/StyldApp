const { withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

function withPhoneOnlyScreens(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults.manifest['supports-screens'] = [
      {
        $: {
          'android:smallScreens': 'true',
          'android:normalScreens': 'true',
          'android:largeScreens': 'true',
          'android:xlargeScreens': 'true',
        },
      },
    ];
    return config;
  });
}

module.exports = createRunOncePlugin(withPhoneOnlyScreens, 'with-phone-only-screens');
