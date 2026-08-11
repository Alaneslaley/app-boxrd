import type { Clock } from './Clock';
import { ZonedBusinessDateProvider } from './ZonedBusinessDateProvider';

class FixedClock implements Clock {
  constructor(private readonly value: string) {}
  now(): Date { return new Date(this.value); }
}

describe('ZonedBusinessDateProvider', () => {
  it.each([
    ['2026-08-10T05:59:59.999Z', '2026-08-09'],
    ['2026-08-10T06:00:00.000Z', '2026-08-10'],
    ['2026-12-31T05:59:59.999Z', '2026-12-30'],
    ['2026-12-31T06:00:00.000Z', '2026-12-31'],
  ])('resuelve %s como fecha de negocio México %s', (now, expected) => {
    expect(new ZonedBusinessDateProvider(new FixedClock(now)).today()).toBe(expected);
  });

  it('no depende del timezone del dispositivo cuando recibe el mismo instante', () => {
    const clock = new FixedClock('2026-08-10T02:00:00.000-04:00');
    expect(new ZonedBusinessDateProvider(clock).today()).toBe('2026-08-10');
  });

  it('siempre entrega formato yyyy-MM-dd', () => {
    expect(new ZonedBusinessDateProvider(new FixedClock('2026-01-02T18:00:00Z')).today())
      .toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
