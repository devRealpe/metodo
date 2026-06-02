import { withModuleFederation } from '@nx/module-federation/angular';
import config from './module-federation.config';

const productionConfig = {
  ...config,
  remotes: [] as [string, string][],
};

export default async (webpackConfig: any) => {
  const moduleFederationConfig = await withModuleFederation(productionConfig, { dts: false });
  const fedConfig = moduleFederationConfig(webpackConfig);

  return {
    ...fedConfig,
    output: {
      ...fedConfig.output,
      publicPath: '/sedu/',
      uniqueName: 'sedu',
    },
  };
};
