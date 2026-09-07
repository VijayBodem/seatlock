import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const ALGORITHM = 'scrypt';
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
    ALGORITHM,
    salt.toString('base64'),
    derivedKey.toString('base64'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const parts = passwordHash.split('$');

  if (parts.length !== 3) {
    return false;
  }

  const [algorithm, saltBase64, expectedKeyBase64] = parts;

  if (
    algorithm !== ALGORITHM ||
    saltBase64 === undefined ||
    expectedKeyBase64 === undefined ||
    saltBase64.length === 0 ||
    expectedKeyBase64.length === 0
  ) {
    return false;
  }

  const salt = Buffer.from(saltBase64, 'base64');
  const expectedKey = Buffer.from(expectedKeyBase64, 'base64');

  if (salt.length === 0 || expectedKey.length !== DERIVED_KEY_LENGTH) {
    return false;
  }

  const actualKey = (await scrypt(
    password,
    salt,
    DERIVED_KEY_LENGTH,
  )) as Buffer;

  return timingSafeEqual(actualKey, expectedKey);
}
