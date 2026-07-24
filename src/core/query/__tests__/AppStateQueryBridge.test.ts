import { focusManager } from '@tanstack/react-query';

import { applyAppState } from '../AppStateQueryBridge';

describe('AppStateQueryBridge', () => {
  it('marca foreground como enfocado', () => {
    const spy = jest.spyOn(focusManager, 'setFocused');
    expect(applyAppState('active')).toBe(true);
    expect(spy).toHaveBeenCalledWith(true);
    spy.mockRestore();
  });

  it('marca background como no enfocado', () => {
    expect(applyAppState('background')).toBe(false);
  });
});
