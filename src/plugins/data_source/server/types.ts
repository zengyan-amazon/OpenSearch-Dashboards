/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataSourcePluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataSourcePluginStart {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataSourceSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DataSourceStart {
  // getDataSourceClient: (dataSourceId: string, request: OpenSearchDashboardsRequest) => Promise<Client>;
}
