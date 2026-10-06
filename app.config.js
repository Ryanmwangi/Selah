/**
 * Dynamic layer over app.json. With APP_VARIANT=development (set by the EAS
 * "development" profile) the app gets its own identity, so a dev client
 * installs beside the App Store build instead of replacing it (and its data).
 * The app and widget both use whichever App Group the build is signed with
 * (they write/read both), so the widget works in the dev variant too.
 */
const isDev = process.env.APP_VARIANT === 'development';

module.exports = ({ config }) => {
  if (!isDev) return config;

  const id = 'app.selah.journal.dev';
  const group = 'group.app.selah.journal.dev';
  const extensions = config.extra.eas.build.experimental.ios.appExtensions.map((ext) => ({
    ...ext,
    bundleIdentifier: `${id}.widget`,
    entitlements: { 'com.apple.security.application-groups': [group] },
  }));

  return {
    ...config,
    name: 'Selah Dev',
    scheme: 'selah-dev',
    ios: {
      ...config.ios,
      bundleIdentifier: id,
      entitlements: { 'com.apple.security.application-groups': [group] },
    },
    android: { ...config.android, package: id },
    extra: {
      ...config.extra,
      eas: {
        ...config.extra.eas,
        build: { experimental: { ios: { appExtensions: extensions } } },
      },
    },
  };
};
