#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/04d6e07bf07f3bf09e78cd9eb1e1235ed5dd0ad6876a6772cf7120f053abd95d/contract';
import endContract from '../../snapshots/04d6e07bf07f3bf09e78cd9eb1e1235ed5dd0ad6876a6772cf7120f053abd95d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/4853dd79dc190f81495b36848e13a88b2d9c95eae74037afda849242c92c259c/contract';
import startContract from '../../snapshots/4853dd79dc190f81495b36848e13a88b2d9c95eae74037afda849242c92c259c/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'payment',
        constraint: 'payment_status_check_70878036',
      }),
      this.addColumn({
        schema: 'public',
        table: 'payment',
        column: col('providerRefundId', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'payment',
        column: col('refundRequestedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'payment',
        column: col('refundedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'payment',
        constraint: 'payment_status_check_06cbda14',
        expression:
          "\"status\" IN ('PENDING', 'SUCCEEDED', 'REFUND_PENDING', 'REFUNDED', 'FAILED', 'CANCELLED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'payment',
        constraint: 'payment_providerRefundId_key',
        columns: ['providerRefundId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
