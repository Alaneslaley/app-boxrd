import { onlineManager } from '@tanstack/react-query';

import { applyNetworkState, isNetworkOnline } from '../NetworkQueryBridge';

describe('NetworkQueryBridge', () => {
  it('trata conectividad sin internet confirmado como offline', () => {
    expect(isNetworkOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('propaga el estado a TanStack onlineManager', () => {
    const spy = jest.spyOn(onlineManager, 'setOnline');
    expect(applyNetworkState({ isConnected: true, isInternetReachable: true })).toBe(true);
    expect(spy).toHaveBeenCalledWith(true);
    spy.mockRestore();
  });
});
