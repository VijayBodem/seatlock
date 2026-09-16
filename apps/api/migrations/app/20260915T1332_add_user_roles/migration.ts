#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0740bd0e79561a6426605e3f020921855af010ab204a57aefc8c2f80b7b55efc/contract';
import startContract from '../../snapshots/0740bd0e79561a6426605e3f020921855af010ab204a57aefc8c2f80b7b55efc/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cf5a53b84a4454f840ce8ffb84e132b2a7f2be84b45e8254db73c38801144c5f/contract';
import endContract from '../../snapshots/cf5a53b84a4454f840ce8ffb84e132b2a7f2be84b45e8254db73c38801144c5f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('role', 'text', {
          notNull: true,
          default: lit('CUSTOMER'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_role_check_3cc42c46',
        expression: "\"role\" IN ('CUSTOMER', 'ADMIN')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
