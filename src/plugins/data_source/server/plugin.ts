/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { first } from 'rxjs/operators';
import { Client } from '@opensearch-project/opensearch';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  OpenSearchDashboardsRequest,
  LegacyAPICaller,
  SavedObjectsErrorHelpers,
} from '../../../core/server';
import { DataSourcePluginConfigType } from '.';
import { OpenSearchClientPool } from './client_pool';
import { dataSource, credential } from './saved_objects';
import {
  DataSourcePluginSetup,
  DataSourcePluginStart,
  DataSourceSetup,
  DataSourceStart,
} from './types';

export interface DataSourceRequestContext {
  getOpenSearchClient: (dataSourceId: string) => Promise<Client>;
  // legacy: {
  //   getLegacyOpenSearchClient: (dataSourceId: string) => Promise<LegacyAPICaller>;
  // };
}

declare module 'opensearch-dashboards/server' {
  interface RequestHandlerContext {
    dataSources: DataSourceRequestContext;
  }
}

export class DataSourcePlugin
  implements
    Plugin<DataSourceSetup, DataSourceStart, DataSourcePluginSetup, DataSourcePluginStart> {
  private readonly logger: Logger;
  private readonly clientPool: OpenSearchClientPool;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.clientPool = new OpenSearchClientPool(this.logger);
  }

  public async setup(core: CoreSetup<DataSourcePluginStart, DataSourceStart>) {
    this.logger.debug('data_source: Setup');

    const config$ = this.initializerContext.config.create<DataSourcePluginConfigType>();
    const config: DataSourcePluginConfigType = await config$.pipe(first()).toPromise();

    // Register credential saved object type
    core.savedObjects.registerType(credential);
    // Register data source saved object type
    core.savedObjects.registerType(dataSource);

    const { getDataSourceClient } = this.clientPool.setup(core, {
      poolSize: config.client_pool_size,
    });

    core.http.registerRouteHandlerContext('dataSources', async (context, request, response) => {
      return {
        getOpenSearchClient: async (dataSourceId: string) => {
          try {
            this.logger.error('Getting client');
            return getDataSourceClient(dataSourceId, context.core.savedObjects.client);
          } catch (error: any) {
            // return response.badRequest();
            // this.logger.error('aaa')
            this.logger.error('Throwing error');
            throw SavedObjectsErrorHelpers.createBadRequestError(error.message);
          }
          // return response.badRequest();
        },
      };
    });

    const router = core.http.createRouter();
    router.get(
      {
        path: '/data-source/test',
        validate: false,
      },
      async (context, request, response) => {
        // const client = await context.dataSources.getOpenSearchClient('37df1970-b6b0-11ec-a339-c18008b701cd');
        const client = await context.dataSources.getOpenSearchClient('aaa');
        return response.ok();
      }
    );

    return {};
  }

  public async start(core: CoreStart) {
    this.logger.debug('data_source: Started');
    this.clientPool.start();
    return {};
  }

  public stop() {}
}
