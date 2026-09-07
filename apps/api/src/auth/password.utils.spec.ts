import { hashPassword } from './password.utils.js';

describe('hashPassword', () => {
  it('returns a structured scrypt password hash', async () => {
    const password = 'correct horse battery staple';

    const passwordHash = await hashPassword(password);

    const parts = passwordHash.split('$');

    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('scrypt');
    expect(parts[1]).not.toBe('');
    expect(parts[2]).not.toBe('');
    expect(passwordHash).not.toContain(password);
  });

  it('uses a different random salt for the same password', async () => {
    const password = 'correct horse battery staple';

    const firstHash = await hashPassword(password);
    const secondHash = await hashPassword(password);

    expect(firstHash).not.toBe(secondHash);
  });
});
