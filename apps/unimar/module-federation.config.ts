import { ModuleFederationConfig } from '@nx/module-federation';

const config: ModuleFederationConfig = {
  name: 'unimar',
  remotes: [
    'hojas_de_vida',
    'viaticos',
    'laboratorios',
    'planes_de_trabajo',
    'internacionalizacion',
  ],
  shared: (libraryName, defaultConfig) => {
    if (libraryName === '@angular/core') {
      return { singleton: true, strictVersion: false, requiredVersion: 'auto' };
    }
    if (libraryName === '@angular/common') {
      return { singleton: true, strictVersion: false, requiredVersion: 'auto' };
    }
    if (libraryName === '@angular/router') {
      return { singleton: true, strictVersion: false, requiredVersion: 'auto' };
    }
    if (libraryName === '@angular/forms') {
      return { singleton: true, strictVersion: false, requiredVersion: 'auto' };
    }
    if (libraryName === 'primeng') {
      return { singleton: true, strictVersion: false, requiredVersion: 'auto' };
    }
    if (libraryName === 'rxjs') {
      return { singleton: true, strictVersion: false, requiredVersion: 'auto' };
    }
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
