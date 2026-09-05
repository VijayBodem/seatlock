#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/dc2b498fddb06a15dca71feca1b08777b251d76e95d61b14a21a79e7aaff6a0a/contract';
import startContract from '../../snapshots/dc2b498fddb06a15dca71feca1b08777b251d76e95d61b14a21a79e7aaff6a0a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e4cf50b6c7e25848b536786af8e0fc2ed8391eb623fb2bba74477a90bfba5ed1/contract';
import endContract from '../../snapshots/e4cf50b6c7e25848b536786af8e0fc2ed8391eb623fb2bba74477a90bfba5ed1/contract.json' with { type: 'json' };
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
        table: 'showtimeSeat',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('seatId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('showtimeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('AVAILABLE'),
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
            'showtimeSeat_status_check_95233df9',
            "\"status\" IN ('AVAILABLE', 'HELD', 'BOOKED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'showtimeSeat',
        constraint: 'showtimeSeat_showtimeId_seatId_key',
        columns: ['showtimeId', 'seatId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimeSeat',
        index: 'showtimeSeat_seatId_idx_3076c3cd',
        columns: ['seatId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimeSeat',
        index: 'showtimeSeat_showtimeId_idx_4ae2449a',
        columns: ['showtimeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'showtimeSeat',
        foreignKey: {
          name: 'showtimeSeat_showtimeId_fkey',
          columns: ['showtimeId'],
          references: { schema: 'public', table: 'showtime', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'showtimeSeat',
        foreignKey: {
          name: 'showtimeSeat_seatId_fkey',
          columns: ['seatId'],
          references: { schema: 'public', table: 'seat', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
