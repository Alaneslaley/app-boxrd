import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

type NetworkStatus = Readonly<{
  isOnline: boolean;
  isInternetReachable: boolean | null;
}>;

const NetworkStatusContext = createContext<NetworkStatus>({
  isOnline: true,
  isInternetReachable: null,
});

export function isNetworkOnline(state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function applyNetworkState(
  state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>,
): boolean {
  const isOnline = isNetworkOnline(state);
  onlineManager.setOnline(isOnline);
  return isOnline;
}

export function NetworkQueryBridge({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    isInternetReachable: null,
  });

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        setStatus({
          isOnline: applyNetworkState(state),
          isInternetReachable: state.isInternetReachable,
        });
      }),
    [],
  );

  const value = useMemo(() => status, [status]);
  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatus {
  return useContext(NetworkStatusContext);
}
