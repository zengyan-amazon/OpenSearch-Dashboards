/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import { schema, TypeOf } from '@osd/config-schema';

export const mfeConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: false }),
  fallback: schema.boolean({ defaultValue: true }),
  timeout: schema.number({ defaultValue: 10000 }),
  remotes: schema.recordOf(
    schema.string(),
    schema.object({ url: schema.string() }),
    { defaultValue: {} }
  ),
});

export type MfeConfigType = TypeOf<typeof mfeConfigSchema>;

export const config = {
  path: 'mfe',
  schema: mfeConfigSchema,
};