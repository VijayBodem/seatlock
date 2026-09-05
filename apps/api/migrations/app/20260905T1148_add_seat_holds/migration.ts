#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b6b1a19dc382e44b28e5b7346de463c83e6cef73463a351b6c2a3ae930270d6b/contract';
import endContract from '../../snapshots/b6b1a19dc382e44b28e5b7346de463c83e6cef73463a351b6c2a3ae930270d6b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e4cf50b6c7e25848b536786af8e0fc2ed8391eb623fb2bba74477a90bfba5ed1/contract';
import startContract from '../../snapshots/e4cf50b6c7e25848b536786af8e0fc2ed8391eb623fb2bba74477a90bfba5ed1/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'seatHold',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('showtimeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'seatHold_status_check_3842699d',
            "\"status\" IN ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'showtimeSeat',
        column: col('holdId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'seatHold',
        index: 'seatHold_showtimeId_idx_4ae2449a',
        columns: ['showtimeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimeSeat',
        index: 'showtimeSeat_holdId_idx_c9785d82',
        columns: ['holdId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seatHold',
        foreignKey: {
          name: 'seatHold_showtimeId_fkey',
          columns: ['showtimeId'],
          references: { schema: 'public', table: 'showtime', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'showtimeSeat',
        foreignKey: {
          name: 'showtimeSeat_holdId_fkey',
          columns: ['holdId'],
          references: { schema: 'public', table: 'seatHold', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
