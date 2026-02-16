"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.mfeConfigSchema = void 0;
const config_schema_1 = require("@osd/config-schema");
exports.mfeConfigSchema = config_schema_1.schema.object({
    enabled: config_schema_1.schema.boolean({ defaultValue: false }),
    fallback: config_schema_1.schema.boolean({ defaultValue: true }),
    timeout: config_schema_1.schema.number({ defaultValue: 10000 }),
    remotes: config_schema_1.schema.recordOf(config_schema_1.schema.string(), config_schema_1.schema.object({ url: config_schema_1.schema.string() }), { defaultValue: {} }),
});
exports.config = {
    path: 'mfe',
    schema: exports.mfeConfigSchema,
};
