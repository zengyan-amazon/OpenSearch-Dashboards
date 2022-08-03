/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import LRUCache from 'lru-cache';
import { Client } from '@opensearch-project/opensearch';
import {
  CoreSetup,
  CoreStart,
  Logger,
  OpenSearchDashboardsRequest,
  SavedObject,
  SavedObjectsServiceStart,
} from 'opensearch-dashboards/server';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../../common';
import { CredentialAttributes, DataSourceAttributes } from '../../common/data_sources';

/**
 * OpenSearch client pool.
 *
 * This client pool uses an LRU cache to manage OpenSearch Js client objects.
 * It reuse TPC connections for each OpenSearch endpoint.
 */
export class OpenSearchClientPool {
  // LRU cache
  //   key: data source endpoint url
  //   value: OpenSearch client object
  private cache: LRUCache<string, Client>;

  constructor(
    private readonly savedObjects: SavedObjectsServiceStart,
    private readonly logger: Logger,
    poolSize: number
  ) {
    this.cache = new LRUCache({
      max: poolSize,
      maxAge: 15 * 60 * 1000, // by default, TCP connection times out in 15 minutes
      async dispose(key, value) {
        try {
          await value.close();
        } catch (e: any) {
          // log and do nothing since we are anyways envicting the client object from cache
          logger.warn(
            `Error closing OpenSearch client when removing from client pool: ${e.message}`
          );
        }
      },
    });
    this.logger.info(`Created data source client pool of size ${poolSize}`);
  }

  setup(core: CoreSetup) {}

  start(core: CoreStart) {}

  getDataSourceClient = async (
    dataSourceId: string,
    request: OpenSearchDashboardsRequest
  ): Promise<Client> => {
    const dataSource = await this.savedObjects
      .getScopedClient(request)
      .get<DataSourceAttributes>(DATA_SOURCE_SAVED_OBJECT_TYPE, dataSourceId);
    const rootClient = this.getRootClient(dataSource.attributes);

    const credentialId = dataSource.references[0].id; // assuming there is 1 and only 1 credential for each data source
    const credential: SavedObject<CredentialAttributes> = await this.savedObjects
      .getScopedClient(request)
      .get('credential', credentialId);
    return this.getQueryClient(rootClient, credential.attributes);
  };

  /**
   * Gets a root client object of the OpenSearch endpoint.
   * Will attempt to get from cache, if cache miss, create a new one and load into cache.
   *
   * @param dataSoruceAttr data source saved objects attributes.
   * @returns OpenSearch client for the given data source endpoint.
   */
  getRootClient(dataSoruceAttr: DataSourceAttributes): Client {
    const endpoint = dataSoruceAttr.endpoint;
    const cachedClient = this.cache.get(endpoint);
    if (cachedClient) {
      return cachedClient;
    } else {
      const client = new Client({
        node: endpoint,
        ssl: {
          rejectUnauthorized: true, // cosnider making this configurable in future
        },
      });
      this.cache.set(endpoint, client);
      return client;
    }
  }

  /**
   * Create a child client object with given auth info.
   *
   * @param rootClient root client for the connection with given data source endpoint.
   * @param credential credential saved object attribute.
   * @returns child client.
   */
  getQueryClient(rootClient: Client, credential: CredentialAttributes): Client {
    const authType = credential.credentialType;
    switch (authType) {
      case 'noauth':
        return rootClient.child();
      case 'basic':
        return this.getBasicAuthClient(rootClient, credential);
      default:
        throw new Error(
          `Unsupported data source authentication type: ${credential.credentialType}`
        );
    }
  }

  getBasicAuthClient(rootClient: Client, credential: CredentialAttributes): Client {
    const username = credential.credentialMaterials?.username;
    const password = credential.credentialMaterials?.password;
    return rootClient.child({
      auth: {
        username,
        password,
      },
    });
  }
}
