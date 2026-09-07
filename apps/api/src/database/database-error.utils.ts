// src/database/database-error.utils.ts

type SqlQueryErrorLike = {
  sqlState?: unknown;
  constraint?: unknown;
};

export function isUniqueConstraintViolation(
  error: unknown,
  constraint?: string,
): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const sqlError = error as SqlQueryErrorLike;

  if (sqlError.sqlState !== '23505') {
    return false;
  }

  if (constraint === undefined) {
    return true;
  }

  return sqlError.constraint === constraint;
}
