const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: {
      unpack: [
        '**/better-sqlite3/**/*',
        '**/@xenova/transformers/**/*',
        '**/sharp/**/*',
      ],
    },
    ignore: [
      /^\/binding\.gyp/,
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'cvmaker',
        authors: 'Thibaut Delahaie',
        description: 'A helper to make your CV',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // {
    //   name: '@electron-forge/plugin-vite',
    //   config: {
    //     build: [
    //       {
    //         entry: 'electron/main.dev.ts', // point d'entrée Electron
    //         config: 'vite.main.config.mjs',
    //       },
    //       {
    //         entry: 'electron/preload.ts',
    //         config: 'vite.preload.config.mjs',
    //       },
    //     ],
    //     renderer: [
    //       {
    //         name: 'main_window',
    //         config: 'vite.renderer.config.mjs',
    //       },
    //     ],
    //   },
    // },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};
