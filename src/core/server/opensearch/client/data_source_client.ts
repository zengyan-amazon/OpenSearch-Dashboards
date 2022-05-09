/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

import { OpenSearchClient } from './types';

/**
 * Serves the same purpose as the normal {@link IClusterClient | cluster client} but exposes
 * an additional `asCurrentUser` method that doesn't use credentials of the OpenSearch Dashboards internal
 * user (as `asInternalUser` does) to request OpenSearch API, but rather passes HTTP headers
 * extracted from the current user request to the API instead.
 *
 * @public
 **/
export interface IDataSourceClusterClient {
  /**
   * A {@link OpenSearchClient | client} to be used to query the opensearch cluster
   * on behalf of the internal OpenSearch Dashboards user.
   */
  readonly asDataSourceUser: OpenSearchClient;
}

/** @internal **/
export class DataSourceClusterClient implements IDataSourceClusterClient {
  constructor(
    public readonly asDataSourceUser: OpenSearchClient // public readonly asCurrentUser: OpenSearchClient
  ) {}
}
