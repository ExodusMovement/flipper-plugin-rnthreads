/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import {
  styled,
  colors,
  FlexRow,
  FlexColumn,
} from 'flipper';
import LaunchScreen from './LaunchScreen';
import SelectScreen from './SelectScreen';
import ErrorScreen from './ErrorScreen';
import ChromeDevTools from './ChromeDevTools';
import { PluginClient, DevicePluginClient } from 'flipper-plugin';

const POLL_SECS = 5 * 1000;
const METRO_PORT_ENV_VAR = process.env.METRO_SERVER_PORT || '8081';
const METRO_PORT = isNaN(+METRO_PORT_ENV_VAR) ? '8081' : METRO_PORT_ENV_VAR;
const METRO_URL = new URL('http://localhost');
METRO_URL.port = METRO_PORT;

export type Target = Readonly<{
  id: string;
  description: string;
  title: string;
  faviconUrl: string;
  devtoolsFrontendUrl: string;
  type: string;
  webSocketDebuggerUrl: string;
  vm: string;
}>;

export type Targets = ReadonlyArray<Target>;

type State = Readonly<{
  targets?: Targets | null;
  selectedTarget?: Target | null;
  error?: Error | null;
}>;

const Content = styled(FlexRow)({
  height: '100%',
  width: '100%',
  flexGrow: 1,
  justifyContent: 'center',
  alignItems: 'center',
});

const Container = styled(FlexColumn)({
  height: '100%',
  width: '100%',
  justifyContent: 'flex-start',
  alignItems: 'flex-start',
  backgroundColor: colors.light02,
});

export function devicePlugin(client: DevicePluginClient) {}

export function Component() {
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null)
  const [targets, setTargets] = useState<Target[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // This is a pretty basic polling mechnaism. We ask Metro every POLL_SECS what the
    // current available targets are and only handle a few basic state transitions.
    const poll = setInterval(checkDebugTargets, POLL_SECS);
    checkDebugTargets();

    return () => clearInterval(poll);
  })

  function checkDebugTargets() {
    fetch(`${METRO_URL.toString()}json`)
      .then((res) => res.json())
      .then((result) => {
        // We only want to use the Reanimated Reload targets.
        const targets_ = result.filter(
          (target: any) =>
            target.title === 'RNThreads Experimental (Improved Chrome Reloads)'
        );

        // Find the currently selected target.
        // If the current selectedTarget isn't returned, clear it.
        let currentlySelected: Target | null = null;
        if (selectedTarget != null) {
          for (const target of result) {
            if (
              selectedTarget.webSocketDebuggerUrl === target.webSocketDebuggerUrl
            ) {
              currentlySelected = selectedTarget;
            }
          }
        }

        // Auto-select the first target if there is one,
        // but don't change the one that's already selected.
        const selectedTarget_ =
          currentlySelected == null && targets_.length === 1
            ? targets_[0]
            : currentlySelected;
        
        // Only update the state if there was a change
        if (selectedTarget != selectedTarget_) {
          setSelectedTarget(selectedTarget_);
        }
        if (targets != targets_) {
          setTargets(targets_);
        }
        if (error != null) {
          setError(null);
        }
      })
      .catch((error) => {
        setSelectedTarget(null);
        setTargets([]);
        setError(error);
      });
  }

  function handleSelect(selectedTarget: Target) {
    setSelectedTarget(selectedTarget);
  }

  function renderContent() {
    if (selectedTarget) {
      return (
        <ChromeDevTools url={selectedTarget.devtoolsFrontendUrl} />
      );
    } else if (targets != null && targets.length === 0) {
      return <LaunchScreen />;
    } else if (targets != null && targets.length > 0) {
      return <SelectScreen targets={targets} onSelect={handleSelect} />;
    } else if (error != null) {
      return <ErrorScreen error={error} />;
    } else {
      return null;
    }
  }

  return (
    <Container>
      <Content>{renderContent()}</Content>
    </Container>
  );
}
