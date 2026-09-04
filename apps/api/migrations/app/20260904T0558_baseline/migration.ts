#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/8560d1c7a86c963faa3d720077bc59108028e0aa0edce7d302a1ba9ce02d722d/contract';
import endContract from '../../snapshots/8560d1c7a86c963faa3d720077bc59108028e0aa0edce7d302a1ba9ce02d722d/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'screen',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('venueId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'seat',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('number', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('row', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('screenId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('STANDARD'),
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
            'seat_type_check_c417c128',
            "\"type\" IN ('STANDARD', 'PREMIUM', 'ACCESSIBLE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'venue',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'seat',
        constraint: 'seat_screenId_row_number_key',
        columns: ['screenId', 'row', 'number'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'screen',
        index: 'screen_venueId_idx_b49e8dab',
        columns: ['venueId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'seat',
        index: 'seat_screenId_idx_2d3dbe54',
        columns: ['screenId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'screen',
        foreignKey: {
          name: 'screen_venueId_fkey',
          columns: ['venueId'],
          references: { schema: 'public', table: 'venue', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'seat',
        foreignKey: {
          name: 'seat_screenId_fkey',
          columns: ['screenId'],
          references: { schema: 'public', table: 'screen', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
