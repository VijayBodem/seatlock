import { hashPassword, verifyPassword } from './password.utils.js';

describe('password utils', () => {
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

  describe('verifyPassword', () => {
    it('returns true for the correct password', async () => {
      const password = 'correct horse battery staple';
      const passwordHash = await hashPassword(password);

      await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
    });

    it('returns false for an incorrect password', async () => {
      const passwordHash = await hashPassword('correct horse battery staple');

      await expect(
        verifyPassword('wrong password value', passwordHash),
      ).resolves.toBe(false);
    });

    it('returns false for a malformed password hash', async () => {
      await expect(
        verifyPassword(
          'correct horse battery staple',
          'not-a-valid-password-hash',
        ),
      ).resolves.toBe(false);
    });

    it('returns false for an unsupported algorithm', async () => {
      const passwordHash = await hashPassword('correct horse battery staple');

      const unsupportedHash = passwordHash.replace(/^scrypt\$/, 'bcrypt$');

      await expect(
        verifyPassword('correct horse battery staple', unsupportedHash),
      ).resolves.toBe(false);
    });
  });
});
