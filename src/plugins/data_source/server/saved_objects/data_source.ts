/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectsType } from 'opensearch-dashboards/server';
import { DATA_SOURCE_SAVED_OBJECT_TYPE } from '../../common';

export const dataSource: SavedObjectsType = {
  name: DATA_SOURCE_SAVED_OBJECT_TYPE,
  namespaceType: 'agnostic',
  hidden: false,
  management: {
    icon: 'apps', // todo: pending ux #2034
    defaultSearchField: 'title',
    importableAndExportable: true,
    getTitle(obj) {
      return obj.attributes.title;
    },
    // todo: update getEditUrl & getInAppUrl after #2021
  },
  mappings: {
    dynamic: false,
    properties: {
      title: {
        type: 'text',
      },
      endpoint: {
        type: 'keyword',
        index: false,
        doc_values: false,
      },
      version: {
        type: 'integer',
      },
    },
  },
};
