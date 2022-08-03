/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SavedObjectAttributes } from 'src/core/types';

export interface DataSourceAttributes extends SavedObjectAttributes {
  title: string;
  endpoint: string;
}

export interface CredentialAttributes extends SavedObjectAttributes {
  title: string;
  credentialType: AuthType;
  credentialMaterials: {
    username: string;
    password: string;
  };
  description: string;
}

export type AuthType = 'noauth' | 'basic';
