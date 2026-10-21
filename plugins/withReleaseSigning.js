/**
 * Adds a release signing config to android/app/build.gradle that reads the
 * upload keystore from environment variables (used by the GitHub Actions build):
 *   NUMDART_KEYSTORE_PATH, NUMDART_KEYSTORE_PASSWORD, NUMDART_KEY_ALIAS, NUMDART_KEY_PASSWORD
 * Without those variables the release build falls back to the debug key (local testing).
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            if (System.getenv("NUMDART_KEYSTORE_PATH")) {
                storeFile file(System.getenv("NUMDART_KEYSTORE_PATH"))
                storePassword System.getenv("NUMDART_KEYSTORE_PASSWORD")
                keyAlias System.getenv("NUMDART_KEY_ALIAS")
                keyPassword System.getenv("NUMDART_KEY_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes('NUMDART_KEYSTORE_PATH')) {
      // 1) add the release signing config next to the debug one
      src = src.replace(/signingConfigs \{\n(\s+debug \{[\s\S]*?\n\s+\})/, (m) => m + RELEASE_CONFIG);
      // 2) make the release build type use it when the keystore is provided
      const bt = src.indexOf('buildTypes {');
      const head = src.slice(0, bt);
      const tail = src
        .slice(bt)
        .replace(
          /(release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
          '$1signingConfig System.getenv("NUMDART_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug',
        );
      src = head + tail;
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
