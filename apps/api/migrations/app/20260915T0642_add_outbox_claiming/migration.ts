#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/d4691abbb7da4f16247e04897b68af87bd838becfca37f6c70f2c7cadb9d9468/contract';
import startContract from '../../snapshots/d4691abbb7da4f16247e04897b68af87bd838becfca37f6c70f2c7cadb9d9468/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e28963872b428e9d005265f14e5ed863b2934d8eb5267562f8d423eec57a9823/contract';
import endContract from '../../snapshots/e28963872b428e9d005265f14e5ed863b2934d8eb5267562f8d423eec57a9823/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'outboxEvent',
        column: col('claimedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'outboxEvent',
        column: col('claimedBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'outboxEvent',
        index: 'outboxEvent_claimedAt_idx_622598dc',
        columns: ['claimedAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
