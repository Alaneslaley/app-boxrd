import { membershipExpirationStatusFromValue, membershipFromDto, normalizeStudentSearch, studentSearchPath } from '../student-queries';

describe('student queries', () => {
  it('normaliza términos de UX y conserva la búsqueda en el request server-side', () => {
    const search = normalizeStudentSearch('  Ana   María  ');
    expect(search).toBe('Ana María');
    expect(studentSearchPath(search, 2)).toBe('/students?search=Ana+Mar%C3%ADa&page=2&size=20');
  });

  it.each([
    ['ACTIVE', 6, 'ACTIVE'],
    ['EXPIRING_SOON', 0, 'EXPIRING_SOON'],
    ['EXPIRING_SOON', 5, 'EXPIRING_SOON'],
    ['EXPIRED', -1, 'EXPIRED'],
    ['INACTIVE', undefined, 'INACTIVE'],
  ] as const)('mapea expirationStatus %s sin recalcular la regla', (expirationStatus, daysUntilExpiration, expected) => {
    const membership = membershipFromDto({ id: '11111111-1111-4111-8111-111111111111', expirationStatus, daysUntilExpiration });
    expect(membership.expirationStatus).toBe(expected);
    expect(membership.daysUntilExpiration).toBe(daysUntilExpiration);
  });

  it('degrada valores contractualmente desconocidos sin fallar', () => {
    expect(membershipExpirationStatusFromValue('UNRECOGNIZED')).toBe('UNKNOWN');
  });
});
