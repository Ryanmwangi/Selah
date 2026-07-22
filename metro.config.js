// Metro config — adds .db (bundled scripture SQLite) as a bundlable asset.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('db');
// expo-sqlite on web ships a wasm build
config.resolver.assetExts.push('wasm');

module.exports = config;
