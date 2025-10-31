#!/usr/bin/env node

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

const Path = require('path');
const Fs = require('fs');
const { argv, exit } = require('process');

const CWD = process.cwd();
const OUTPUT_DIR = Path.resolve(CWD, 'build_v5');
const CONFIG_PATH = Path.resolve(CWD, 'webpack.v5.config.js');
const WEBPACK_ALIAS = 'webpack5';
const TYPE_ONLY_EXPORT_WARNING = /export .* was not found in/;
const ANSI_ESCAPE_REGEX = /\u001b\[[0-9;]*m/g;

const stripAnsi = (value) =>
  typeof value === 'string' ? value.replace(ANSI_ESCAPE_REGEX, '') : '';

function resolveWebpackPackageJson() {
  try {
    return require.resolve(`${WEBPACK_ALIAS}/package.json`, { paths: [CWD] });
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err;
    }
    return undefined;
  }
}

function getWebpackInfo() {
  const webpackPkgPath = resolveWebpackPackageJson();
  if (!webpackPkgPath) {
    return { installed: false };
  }

  const pkgJson = require(webpackPkgPath);
  const major = parseInt(String(pkgJson.version).split('.')[0], 10);
  return {
    installed: true,
    version: pkgJson.version,
    isV5OrHigher: Number.isInteger(major) && major >= 5,
  };
}

function ensureOutputDir() {
  if (!Fs.existsSync(OUTPUT_DIR)) {
    Fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function main() {
  const webpackInfo = getWebpackInfo();

  ensureOutputDir();

  if (!webpackInfo.installed) {
    console.log(
      `[build:v5] Webpack 5 not detected. Install it with "yarn add -D ${WEBPACK_ALIAS}@npm:webpack@^5" and rerun this command.`
    );
    exit(0);
  }

  if (!webpackInfo.isV5OrHigher) {
    console.log(
      `[build:v5] Detected ${WEBPACK_ALIAS}@${webpackInfo.version}. Please install webpack@^5 before wiring the pilot build.`
    );
    exit(0);
  }

  if (!Fs.existsSync(CONFIG_PATH)) {
    console.log(`[build:v5] webpack@${webpackInfo.version} detected, but ${Path.basename(
      CONFIG_PATH
    )} is missing. Add the pilot configuration and rerun the command.`);
    exit(0);
  }

  let webpack;
  try {
    webpack = require(require.resolve(WEBPACK_ALIAS, { paths: [CWD] }));
  } catch (error) {
    console.error(`[build:v5] Failed to require ${WEBPACK_ALIAS} even though it appears installed.`);
    console.error(error);
    exit(1);
  }

  const argvFlags = argv.slice(2);
  const watch = argvFlags.includes('--watch');

  let config;
  try {
    // eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires
    config = require(CONFIG_PATH);
  } catch (error) {
    console.error(`[build:v5] Failed to load ${CONFIG_PATH}`);
    console.error(error);
    exit(1);
  }

  const configs = Array.isArray(config) ? config : [config];
  if (process.env.BUILD_V5_DEBUG === 'true') {
    configs.forEach((cfg, idx) => {
      console.log(`[build:v5] config[${idx}] entries:`, Object.keys(cfg.entry || {}));
      (cfg.module?.rules || []).forEach((rule, ruleIdx) => {
        console.log(`[build:v5] rule[${ruleIdx}] test:`, rule.test?.toString());
        if (rule.use) {
          console.log(`[build:v5] rule[${ruleIdx}] use:`,
            Array.isArray(rule.use)
              ? rule.use.map((u) => (typeof u === 'string' ? u : u.loader))
              : typeof rule.use === 'string'
                ? rule.use
                : rule.use.loader
          );
        }
      });
    });
  }
  const compiler = webpack(configs);

  const callback = (err, stats) => {
    if (err) {
      console.error('[build:v5] Webpack compilation error:\n', err);
      if (!watch) {
        exit(1);
      }
      return;
    }

    if (stats) {
      const statsList = Array.isArray(stats.stats) ? stats.stats : [stats];
      for (const stat of statsList) {
        if (
          process.env.BUILD_V5_DEBUG === 'true' &&
          stat.compilation &&
          Array.isArray(stat.compilation.warnings) &&
          stat.compilation.warnings.length > 0
        ) {
          const sample = stat.compilation.warnings[0];
          const sampleMessage =
            typeof sample === 'string'
              ? sample
              : sample && typeof sample.message === 'string'
              ? sample.message
              : '';
          console.log('[build:v5] sample warning:', sampleMessage);
        }
        if (stat.compilation && Array.isArray(stat.compilation.warnings)) {
          stat.compilation.warnings = stat.compilation.warnings.filter((warning) => {
            const message =
              typeof warning === 'string'
                ? warning
                : warning && typeof warning.message === 'string'
                ? warning.message
                : '';
            return !TYPE_ONLY_EXPORT_WARNING.test(message);
          });
        }
      }
      if (Array.isArray(stats.stats)) {
        stats.stats = statsList;
      }
      const statsOutput = stats.toString({
        colors: true,
        chunks: false,
        modules: false,
        warningsFilter: [TYPE_ONLY_EXPORT_WARNING],
      });
      const sanitizedLines = [];
      let skipping = false;
      for (const line of statsOutput.split('\n')) {
        const plain = stripAnsi(line);
        if (TYPE_ONLY_EXPORT_WARNING.test(plain)) {
          if (process.env.BUILD_V5_DEBUG === 'true') {
            console.log('[build:v5] filtering warning line:', plain);
          }
          skipping = true;
          continue;
        }
        if (skipping) {
          if (plain.trim().startsWith('@ ')) {
            continue;
          }
          skipping = false;
        }
        sanitizedLines.push(line);
      }
      console.log(sanitizedLines.join('\n'));

      if (stats.hasErrors()) {
        console.error('[build:v5] Compilation completed with errors.');
        if (!watch) {
          exit(1);
        }
        return;
      }
      const outputPaths = statsList
        .map((stat) => stat?.compilation?.outputOptions?.path || OUTPUT_DIR)
        .filter(Boolean);
      console.log(
        `[build:v5] Compilation successful. Assets written to ${[...new Set(outputPaths)].join(
          ', '
        )}.`
      );
    }

    if (!watch) {
      compiler.close(() => exit(0));
    }
  };

  if (watch) {
    console.log('[build:v5] Starting webpack in watch mode…');
    compiler.watch({}, callback);
  } else {
    console.log('[build:v5] Starting one-off webpack build…');
    compiler.run(callback);
  }
}

main();
