#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8560d1c7a86c963faa3d720077bc59108028e0aa0edce7d302a1ba9ce02d722d/contract';
import startContract from '../../snapshots/8560d1c7a86c963faa3d720077bc59108028e0aa0edce7d302a1ba9ce02d722d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dc2b498fddb06a15dca71feca1b08777b251d76e95d61b14a21a79e7aaff6a0a/contract';
import endContract from '../../snapshots/dc2b498fddb06a15dca71feca1b08777b251d76e95d61b14a21a79e7aaff6a0a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'showtime',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('screenId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('startsAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'showtime',
        index: 'showtime_screenId_idx_2d3dbe54',
        columns: ['screenId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'showtime',
        foreignKey: {
          name: 'showtime_screenId_fkey',
          columns: ['screenId'],
          references: { schema: 'public', table: 'screen', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
