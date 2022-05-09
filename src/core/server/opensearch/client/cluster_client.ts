/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import { Client } from '@elastic/elasticsearch';
import { Logger } from '../../logging';
import { GetAuthHeaders, Headers, isOpenSearchDashboardsRequest, isRealRequest } from '../../http';
import { ensureRawRequest, filterHeaders, OpenSearchDashboardsRequest } from '../../http/router';
import { ScopeableRequest } from '../types';
import { OpenSearchClient } from './types';
import { configureClient } from './configure_client';
import { OpenSearchClientConfig } from './client_config';
import { ScopedClusterClient, IScopedClusterClient } from './scoped_cluster_client';
import { DEFAULT_HEADERS } from '../default_headers';
import { DataSourceClusterClient } from './data_source_client';
import { IDataSourceClusterClient } from '.';
import { SavedObjectsClientContract } from '../../types';

const noop = () => undefined;

/**
 * Represents an OpenSearch cluster API client created by the platform.
 * It allows to call API on behalf of the internal OpenSearch Dashboards user and
 * the actual user that is derived from the request headers (via `asScoped(...)`).
 *
 * @public
 **/
export interface IClusterClient {
  /**
   * A {@link OpenSearchClient | client} to be used to query the OpenSearch cluster on behalf of the OpenSearch Dashboards internal user
   */
  readonly asInternalUser: OpenSearchClient;
  /**
   * Creates a {@link IScopedClusterClient | scoped cluster client} bound to given {@link ScopeableRequest | request}
   */
  asScoped: (request: ScopeableRequest) => IScopedClusterClient;

  asDataSource: (
    request: OpenSearchDashboardsRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) => Promise<IDataSourceClusterClient>;
}

/**
 * See {@link IClusterClient}
 *
 * @public
 */
export interface ICustomClusterClient extends IClusterClient {
  /**
   * Closes the cluster client. After that client cannot be used and one should
   * create a new client instance to be able to interact with OpenSearch API.
   */
  close: () => Promise<void>;
}

/** @internal **/
export class ClusterClient implements ICustomClusterClient {
  public readonly asInternalUser: Client;
  private readonly rootScopedClient: Client;
  private readonly rootDataSourceClient: Client;

  private isClosed = false;

  constructor(
    private readonly config: OpenSearchClientConfig,
    logger: Logger,
    private readonly getAuthHeaders: GetAuthHeaders = noop
  ) {
    this.asInternalUser = configureClient(config, { logger });
    this.rootScopedClient = configureClient(config, { logger, scoped: true });
    // TODO: explore If we can just use asInternalUser instead
    this.rootDataSourceClient = configureClient(config, { logger, scoped: true });
  }

  asScoped(request: ScopeableRequest) {
    const scopedHeaders = this.getScopedHeaders(request);
    const scopedClient = this.rootScopedClient.child({
      headers: scopedHeaders,
    });
    return new ScopedClusterClient(this.asInternalUser, scopedClient);
  }

  async asDataSource(
    request: OpenSearchDashboardsRequest,
    savedObjectsClient: SavedObjectsClientContract
  ) {
    const dataHeaders = this.getScopedHeaders(request);
    console.log('zhongnan print header');
    console.log(dataHeaders);

    // TODO: question -> 1. declare cleaner interface for request with datasource? 2.how do we do a performance test?

    // 1. fetch meta info of data source using saved_object client
    const dataSource = request.body.dataSource
      ? await savedObjectsClient.get('data-source', request.body.dataSource)
      : undefined;

    console.log('zhongnan as Datasource');
    console.log(JSON.stringify(dataSource));

    const dataSourceObj = dataSource!.attributes as any;
    const url = dataSourceObj.endpoint.url;
    const username = dataSourceObj.endpoint.credentials.username;
    const password = dataSourceObj.endpoint.credentials.password;

    // 2. create dataSourceClient and return
    const dataSourceClient = this.rootDataSourceClient.child({
      headers: dataHeaders,
      node: url,
      auth: {
        username,
        password,
      },
    });

    return new DataSourceClusterClient(dataSourceClient);
  }

  public async close() {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    await Promise.all([
      this.asInternalUser.close(),
      this.rootScopedClient.close(),
      this.rootDataSourceClient.close(),
    ]);
  }

  private getScopedHeaders(request: ScopeableRequest): Headers {
    let scopedHeaders: Headers;
    if (isRealRequest(request)) {
      const requestHeaders = ensureRawRequest(request).headers;
      const requestIdHeaders = isOpenSearchDashboardsRequest(request)
        ? { 'x-opaque-id': request.id }
        : {};
      const authHeaders = this.getAuthHeaders(request);

      scopedHeaders = filterHeaders({ ...requestHeaders, ...requestIdHeaders, ...authHeaders }, [
        'x-opaque-id',
        ...this.config.requestHeadersWhitelist,
      ]);
      // Zhongnan change
      // scopedHeaders = filterHeaders({ ...requestHeaders, ...authHeaders }, [
      //   ...this.config.requestHeadersWhitelist,
      // ]);
    } else {
      scopedHeaders = filterHeaders(request?.headers ?? {}, this.config.requestHeadersWhitelist);
    }

    return {
      ...DEFAULT_HEADERS,
      ...this.config.customHeaders,
      ...scopedHeaders,
    };
  }
}
