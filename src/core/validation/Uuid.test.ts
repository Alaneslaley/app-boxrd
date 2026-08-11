import { isUuid } from './Uuid';

describe('isUuid', () => {
  it('acepta UUID RFC con variante válida', () => {
    expect(isUuid('2ec46652-a5d1-4b4e-a366-3d85f33778c0')).toBe(true);
  });

  it.each(['', 'not-a-uuid', '00000000-0000-0000-0000-000000000000', undefined])
  ('rechaza identificador no válido %s', (value) => {
    expect(isUuid(value)).toBe(false);
  });
});
