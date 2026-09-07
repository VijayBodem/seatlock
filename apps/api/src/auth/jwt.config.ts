import 'dotenv/config';

export const JWT_ACCESS_TOKEN_EXPIRES_IN = '15m';

export function getJwtSecret(): string {
  const secret = process.env['JWT_SECRET'];

  if (secret === undefined || secret.trim().length === 0) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  return secret;
}
