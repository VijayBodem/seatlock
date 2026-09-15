#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0740bd0e79561a6426605e3f020921855af010ab204a57aefc8c2f80b7b55efc/contract';
import endContract from '../../snapshots/0740bd0e79561a6426605e3f020921855af010ab204a57aefc8c2f80b7b55efc/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e28963872b428e9d005265f14e5ed863b2934d8eb5267562f8d423eec57a9823/contract';
import startContract from '../../snapshots/e28963872b428e9d005265f14e5ed863b2934d8eb5267562f8d423eec57a9823/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'outboxEvent',
        column: col('nextAttemptAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'outboxEvent',
        index: 'outboxEvent_nextAttemptAt_idx_34b4e877',
        columns: ['nextAttemptAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
