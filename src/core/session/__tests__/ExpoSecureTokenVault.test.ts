import * as SecureStore from 'expo-secure-store';

import {
  ExpoSecureTokenVault,
  REFRESH_TOKEN_KEY,
} from '../ExpoSecureTokenVault';

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);
const deleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);

describe('ExpoSecureTokenVault', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getItemAsync.mockResolvedValue(null);
    setItemAsync.mockResolvedValue();
    deleteItemAsync.mockResolvedValue();
  });

  it('usa una clave estable y versionada compatible con SecureStore', () => {
    expect(REFRESH_TOKEN_KEY).toBe('gymbox.auth.refresh-token.v1');
    expect(REFRESH_TOKEN_KEY).toMatch(/^[a-zA-Z0-9._-]+$/);
  });

  it('devuelve null cuando no existe refresh token', async () => {
    const vault = new ExpoSecureTokenVault();

    await expect(vault.getRefreshToken()).resolves.toBeNull();
    expect(getItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    expect(deleteItemAsync).not.toHaveBeenCalled();
  });

  it('devuelve el token como valor opaco sin modificarlo', async () => {
    const vault = new ExpoSecureTokenVault();
    getItemAsync.mockResolvedValue(' refresh-token ');

    await expect(vault.getRefreshToken()).resolves.toBe(' refresh-token ');
  });

  it.each(['', ' ', '\t\r\n'])(
    'trata como corrupción un valor vacío o whitespace (%j) y lo elimina',
    async (storedValue) => {
      const vault = new ExpoSecureTokenVault();
      getItemAsync.mockResolvedValue(storedValue);

      await expect(vault.getRefreshToken()).resolves.toBeNull();
      expect(deleteItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
    },
  );

  it('guarda únicamente el refresh token con protección del dispositivo', async () => {
    const vault = new ExpoSecureTokenVault();

    await vault.setRefreshToken('rotated-refresh-token');

    expect(setItemAsync).toHaveBeenCalledWith(
      REFRESH_TOKEN_KEY,
      'rotated-refresh-token',
      {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
  });

  it.each(['', ' ', '\t\r\n'])(
    'rechaza un token vacío o whitespace (%j) sin invocar SecureStore',
    async (token) => {
      const vault = new ExpoSecureTokenVault();

      await expect(vault.setRefreshToken(token)).rejects.toThrow(
        'El refresh token no puede estar vacío.',
      );
      expect(setItemAsync).not.toHaveBeenCalled();
    },
  );

  it('elimina exclusivamente la clave de refresh token', async () => {
    const vault = new ExpoSecureTokenVault();

    await vault.clear();

    expect(deleteItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });

  it.each([
    ['lectura', () => getItemAsync.mockRejectedValue(new Error('read failed')), 'get'],
    ['escritura', () => setItemAsync.mockRejectedValue(new Error('write failed')), 'set'],
    ['borrado', () => deleteItemAsync.mockRejectedValue(new Error('delete failed')), 'clear'],
  ] as const)(
    'propaga errores nativos de %s para que SessionService decida la recuperación',
    async (_operation, arrange, action) => {
      const vault = new ExpoSecureTokenVault();
      arrange();

      if (action === 'get') {
        await expect(vault.getRefreshToken()).rejects.toThrow('read failed');
      } else if (action === 'set') {
        await expect(vault.setRefreshToken('token')).rejects.toThrow('write failed');
      } else {
        await expect(vault.clear()).rejects.toThrow('delete failed');
      }
    },
  );
});
