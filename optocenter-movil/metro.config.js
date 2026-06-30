// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ignorar carpetas nativas de Android/iOS dentro de node_modules para evitar errores de watcher en Windows
config.resolver.blockList = [
  /node_modules\/.*\/android\/.*/,
  /node_modules\/.*\/ios\/.*/
];

module.exports = config;
