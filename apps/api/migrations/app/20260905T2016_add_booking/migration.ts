#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a054c3b36a49ecfda44d968342520580bb6429a11efbbaf3f4645622ef79d310/contract';
import endContract from '../../snapshots/a054c3b36a49ecfda44d968342520580bb6429a11efbbaf3f4645622ef79d310/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b6b1a19dc382e44b28e5b7346de463c83e6cef73463a351b6c2a3ae930270d6b/contract';
import startContract from '../../snapshots/b6b1a19dc382e44b28e5b7346de463c83e6cef73463a351b6c2a3ae930270d6b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'booking',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('holdId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('showtimeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'showtimeSeat',
        column: col('bookingId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'booking',
        constraint: 'booking_holdId_key',
        columns: ['holdId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'booking',
        index: 'booking_showtimeId_idx_4ae2449a',
        columns: ['showtimeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtimeSeat',
        index: 'showtimeSeat_bookingId_idx_17848f4a',
        columns: ['bookingId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'booking',
        foreignKey: {
          name: 'booking_showtimeId_fkey',
          columns: ['showtimeId'],
          references: { schema: 'public', table: 'showtime', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'booking',
        foreignKey: {
          name: 'booking_holdId_fkey',
          columns: ['holdId'],
          references: { schema: 'public', table: 'seatHold', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'showtimeSeat',
        foreignKey: {
          name: 'showtimeSeat_bookingId_fkey',
          columns: ['bookingId'],
          references: { schema: 'public', table: 'booking', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
