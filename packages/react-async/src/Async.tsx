import * as React from 'react';
import {LoadProps} from '@shopify/async';
import {Omit} from '@shopify/useful-types';
import {Effect} from '@shopify/react-effect';

import {AsyncAssetContext, AsyncAssetManager} from './context/assets';

interface Props<Value> extends LoadProps<Value> {
  defer?: boolean;
  manager?: AsyncAssetManager;
  render?(value: Value | null): React.ReactNode;
  renderLoading?(): React.ReactNode;
}

interface State<Value> {
  resolved: Value | null;
  loading: boolean;
}

/* eslint-disable camelcase */
declare const __webpack_require__: (id: string) => any;
declare const __webpack_modules__: {[key: string]: any};
/* eslint-enable camelcase */

class ConnectedAsync<Value> extends React.Component<
  Props<Value>,
  State<Value>
> {
  state: State<Value> = initialState(this.props);

  private mounted = true;

  componentWillUnmount() {
    this.mounted = false;
  }

  async componentDidMount() {
    if (this.state.resolved != null) {
      return;
    }

    try {
      const resolved = await this.props.load();

      if (this.mounted) {
        this.setState({resolved: normalize(resolved), loading: false});
      }
    } catch (error) {
      // Silently swallowing errors for now
    }
  }

  render() {
    const {
      id,
      manager,
      render = defaultRender,
      renderLoading = defaultRender,
    } = this.props;
    const {resolved, loading} = this.state;

    const effect =
      resolved != null && id != null && manager != null ? (
        <Effect
          kind={manager.effect}
          perform={() => manager.markAsUsed(id())}
        />
      ) : null;

    const content = loading ? renderLoading() : render(resolved);

    return (
      <>
        {effect}
        {content}
      </>
    );
  }
}

export function Async<Value>(props: Omit<Props<Value>, 'manager'>) {
  return (
    <AsyncAssetContext.Consumer>
      {manager => <ConnectedAsync manager={manager} {...props} />}
    </AsyncAssetContext.Consumer>
  );
}

function initialState<Value>(props: Props<Value>): State<Value> {
  const canResolve = !props.defer && props.id;
  const resolved = canResolve && props.id ? tryRequire(props.id()) : null;

  return {
    resolved,
    loading: !canResolve,
  };
}

function defaultRender() {
  return null;
}

function normalize(module: any) {
  if (module == null) {
    return null;
  }

  const value = 'default' in module ? module.default : module;
  return value == null ? null : value;
}

function tryRequire(id: string) {
  if (
    /* eslint-disable camelcase */
    typeof __webpack_require__ === 'function' &&
    typeof __webpack_modules__ === 'object' &&
    __webpack_modules__[id]
    /* eslint-enable camelcase */
  ) {
    try {
      return normalize(__webpack_require__(id));
    } catch {
      // Just ignore failures
    }
  }

  return undefined;
}