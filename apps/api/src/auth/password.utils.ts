import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const SALT_LENGTH = 16;
const DERIVED_KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scrypt(
    password,
    salt,
    DERIVED_KEY_LENGTH,
  )) as Buffer;

  return [
    'scrypt',
    salt.toString('base64'),
    derivedKey.toString('base64'),
  ].join('$');
}
