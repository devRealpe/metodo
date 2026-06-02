import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'ordenes-pago-web',
  exposes: {
    './Routes': 'apps/ordenes-pago-web/src/app/remote-entry/entry.routes.ts',
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
