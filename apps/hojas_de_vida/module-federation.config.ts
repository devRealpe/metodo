import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'hojas_de_vida',
  exposes: {
    './Routes': 'apps/hojas_de_vida/src/app/remote-entry/entry.routes.ts',
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

export default config;
