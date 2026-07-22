/**
 * @bacons/apple-targets config for the Selah iOS widget extension.
 *
 * `type: 'widget'` makes prebuild generate a WidgetKit extension target from
 * the Swift files in this folder. The App Group lets the widget read the
 * payload the app writes via ExtensionStorage (see src/lib/widgetBridge.ts).
 *
 * Keep the group id in sync with app.json > ios.entitlements and the suite
 * name in index.swift.
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'SelahWidget',
  deploymentTarget: '16.0', // lock-screen accessory widgets need iOS 16+
  entitlements: {
    'com.apple.security.application-groups': ['group.app.selah.journal'],
  },
});
