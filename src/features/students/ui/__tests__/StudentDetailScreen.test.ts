import { membershipExpirationPresentation } from '../StudentDetailScreen';

describe('membership expiration presentation', () => {
  it.each([
    [0, 'Vence hoy'],
    [1, 'Vence mañana'],
    [5, 'Vence en 5 días'],
  ])('muestra EXPIRING_SOON con daysUntilExpiration=%s', (daysUntilExpiration, detail) => {
    expect(membershipExpirationPresentation({ id: '1', expirationStatus: 'EXPIRING_SOON', daysUntilExpiration })).toMatchObject({ label: 'Próxima a vencer', tone: 'warning', detail });
  });
});
