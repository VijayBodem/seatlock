#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7d704f1debd5b4986976be4fcfe2be2cce91a789312156d28865424f08d43b8a/contract';
import startContract from '../../snapshots/7d704f1debd5b4986976be4fcfe2be2cce91a789312156d28865424f08d43b8a/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d4691abbb7da4f16247e04897b68af87bd838becfca37f6c70f2c7cadb9d9468/contract';
import endContract from '../../snapshots/d4691abbb7da4f16247e04897b68af87bd838becfca37f6c70f2c7cadb9d9468/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'outboxEvent',
        columns: [
          col('aggregateId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('aggregateType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('eventType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lastError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('publishedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'outboxEvent',
        index: 'outboxEvent_aggregateType_aggregateId_idx_816576d9',
        columns: ['aggregateType', 'aggregateId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'outboxEvent',
        index: 'outboxEvent_publishedAt_createdAt_idx_e43e9da7',
        columns: ['publishedAt', 'createdAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
