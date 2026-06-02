import { withModuleFederation } from '@nx/module-federation/angular';
import config from './module-federation.config';

/**
 * DTS Plugin is disabled in Nx Workspaces as Nx already provides Typing support for Module Federation
 * The DTS Plugin can be enabled by setting dts: true
 * Learn more about the DTS Plugin here: https://module-federation.io/configure/dts.html
 */
const productionConfig = {
  ...config,
  remotes: [
    ['hojas_de_vida', 'https://apps.umariana.edu.co/hojas_de_vida/remoteEntry.mjs'] as [string, string],
    ['viaticos', 'https://apps.umariana.edu.co/viaticos/remoteEntry.mjs'] as [string, string],
    ['laboratorios', 'https://apps.umariana.edu.co/laboratorios/remoteEntry.mjs'] as [string, string],
    ['planes_de_trabajo', 'https://apps.umariana.edu.co/planes_de_trabajo/remoteEntry.mjs'] as [string, string],
    ['internacionalizacion', 'https://apps.umariana.edu.co/internacionalizacion/remoteEntry.mjs'] as [string, string],
  ],
};

export default withModuleFederation(productionConfig, { dts: false });
