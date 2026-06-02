import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'planes_de_trabajo',
  exposes: {
    './Routes': 'apps/planes_de_trabajo/src/app/remote-entry/entry.routes.ts',
  },
  shared: (libraryName, defaultConfig) => {
    if (libraryName === '@microfrontends/shared-services') {
      return { singleton: true, strictVersion: false };
    }
    if (libraryName === '@microfrontends/shared-models') {
      return { singleton: true, strictVersion: false };
    }
    return defaultConfig;
  },
};

/**
 * Nx requires a default export of the config to allow correct resolution of the module federation graph.
 **/
export default config;
