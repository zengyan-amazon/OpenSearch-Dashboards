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

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from 'opensearch-dashboards/public';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiCode,
  EuiPanel,
} from '@elastic/eui';

interface MfeExampleAppProps {
  core: CoreStart;
}

const MfeExampleApp: React.FC<MfeExampleAppProps> = ({ core }) => {
  return (
    <EuiPage restrictWidth="1000px">
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle size="l">
                <h1>Module Federation Example Plugin</h1>
              </EuiTitle>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <EuiCallOut
              title="MFE Plugin Loaded Successfully!"
              color="success"
              iconType="check"
            >
              <p>
                This plugin has been successfully loaded as a Module Federation remote module.
              </p>
            </EuiCallOut>

            <EuiSpacer size="l" />

            <EuiPanel paddingSize="l">
              <EuiTitle size="m">
                <h2>Plugin Information</h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText>
                <p>
                  <strong>Plugin ID:</strong> <EuiCode>mfeExample</EuiCode>
                </p>
                <p>
                  <strong>App ID:</strong> <EuiCode>mfe-example</EuiCode>
                </p>
                <p>
                  <strong>Module Federation:</strong> Enabled
                </p>
                <p>
                  <strong>Remote Entry:</strong>{' '}
                  <EuiCode>target/public/mfe/remoteEntry.js</EuiCode>
                </p>
              </EuiText>
            </EuiPanel>

            <EuiSpacer size="l" />

            <EuiPanel paddingSize="l">
              <EuiTitle size="m">
                <h2>How It Works</h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText>
                <p>
                  This example plugin demonstrates Module Federation capabilities in OpenSearch
                  Dashboards:
                </p>
                <ul>
                  <li>The plugin is built as a separate remote module using Rspack</li>
                  <li>It's loaded dynamically at runtime from a CDN or static server</li>
                  <li>The main application shell loads it when navigating to this app</li>
                  <li>All dependencies are shared to minimize bundle size</li>
                </ul>
              </EuiText>
            </EuiPanel>

            <EuiSpacer size="l" />

            <EuiPanel paddingSize="l">
              <EuiTitle size="m">
                <h2>Development Workflow</h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiText>
                <p>To develop MFE plugins:</p>
                <ol>
                  <li>
                    Build the plugin: <EuiCode>yarn build:mfe --plugin-id=mfeExample</EuiCode>
                  </li>
                  <li>
                    Serve it locally:{' '}
                    <EuiCode>yarn serve:mfe --plugin-id=mfeExample --port=9001</EuiCode>
                  </li>
                  <li>
                    Configure OpenSearch Dashboards to load from the local server in{' '}
                    <EuiCode>opensearch_dashboards.yml</EuiCode>
                  </li>
                  <li>
                    Use watch mode for development:{' '}
                    <EuiCode>yarn build:mfe:watch --plugin-id=mfeExample</EuiCode>
                  </li>
                </ol>
              </EuiText>
            </EuiPanel>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};

export const renderApp = (core: CoreStart, element: HTMLElement) => {
  ReactDOM.render(<MfeExampleApp core={core} />, element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};