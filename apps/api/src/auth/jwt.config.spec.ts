import { getJwtSecret, JWT_ACCESS_TOKEN_EXPIRES_IN } from './jwt.config.js';

describe('jwt config', () => {
  const originalJwtSecret = process.env['JWT_SECRET'];

  afterEach(() => {
    if (originalJwtSecret === undefined) {
      delete process.env['JWT_SECRET'];
    } else {
      process.env['JWT_SECRET'] = originalJwtSecret;
    }
  });

  it('returns JWT_SECRET from the environment', () => {
    process.env['JWT_SECRET'] = 'test-jwt-secret';

    expect(getJwtSecret()).toBe('test-jwt-secret');
  });

  it('rejects a missing JWT_SECRET', () => {
    delete process.env['JWT_SECRET'];

    expect(() => getJwtSecret()).toThrow(
      'JWT_SECRET environment variable is required',
    );
  });

  it('rejects an empty JWT_SECRET', () => {
    process.env['JWT_SECRET'] = '   ';

    expect(() => getJwtSecret()).toThrow(
      'JWT_SECRET environment variable is required',
    );
  });

  it('uses a 15 minute access-token lifetime', () => {
    expect(JWT_ACCESS_TOKEN_EXPIRES_IN).toBe('15m');
  });
});
