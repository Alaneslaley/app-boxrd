import { parseEnvironment } from '../environment.schema';

const validEnvironment = {
  environment: 'local',
  apiBaseUrl: 'http://localhost:8080',
  appVersion: '0.1.0',
  buildNumber: 'test',
  commit: 'abc12345',
  enableDemoSession: 'true',
};

describe('environment schema', () => {
  it('acepta local HTTP y transforma flags públicos', () => {
    expect(parseEnvironment(validEnvironment).enableDemoSession).toBe(true);
  });

  it('rechaza staging sin HTTPS', () => {
    expect(() =>
      parseEnvironment({ ...validEnvironment, environment: 'staging' }),
    ).toThrow('staging requiere HTTPS');
  });

  it('rechaza una URL que ya contiene /api/v1', () => {
    expect(() =>
      parseEnvironment({
        ...validEnvironment,
        apiBaseUrl: 'http://localhost:8080/api/v1',
      }),
    ).toThrow('debe terminar antes de /api/v1');
  });
});
