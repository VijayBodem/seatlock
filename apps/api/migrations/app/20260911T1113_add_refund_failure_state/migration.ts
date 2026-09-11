#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/04d6e07bf07f3bf09e78cd9eb1e1235ed5dd0ad6876a6772cf7120f053abd95d/contract';
import startContract from '../../snapshots/04d6e07bf07f3bf09e78cd9eb1e1235ed5dd0ad6876a6772cf7120f053abd95d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7d704f1debd5b4986976be4fcfe2be2cce91a789312156d28865424f08d43b8a/contract';
import endContract from '../../snapshots/7d704f1debd5b4986976be4fcfe2be2cce91a789312156d28865424f08d43b8a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'payment',
        constraint: 'payment_status_check_06cbda14',
      }),
      this.addColumn({
        schema: 'public',
        table: 'payment',
        column: col('refundFailedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'payment',
        column: col('refundFailureReason', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'payment',
        constraint: 'payment_status_check_35405b59',
        expression:
          "\"status\" IN ('PENDING', 'SUCCEEDED', 'REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED', 'FAILED', 'CANCELLED')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
