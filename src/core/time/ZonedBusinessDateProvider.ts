import { BUSINESS_TIME_ZONE } from './BusinessTimeZone';
import type { BusinessDateProvider } from './BusinessDateProvider';
import type { Clock } from './Clock';

export class ZonedBusinessDateProvider implements BusinessDateProvider {
  constructor(
    private readonly clock: Clock,
    private readonly timeZone: string = BUSINESS_TIME_ZONE,
  ) {}

  today(): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(this.clock.now());
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const year = values.get('year');
    const month = values.get('month');
    const day = values.get('day');
    if (!year || !month || !day) {
      throw new Error('No fue posible resolver la fecha de negocio.');
    }
    return `${year}-${month}-${day}`;
  }
}
