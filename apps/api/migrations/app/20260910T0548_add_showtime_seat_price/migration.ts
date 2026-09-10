#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/590e8fe062b81a4b94c2bc48e5bd9ab5c334beca3024ce0dac63add5b5adf8f1/contract';
import startContract from '../../snapshots/590e8fe062b81a4b94c2bc48e5bd9ab5c334beca3024ce0dac63add5b5adf8f1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d7be26ba792b4b4052c9ece5e53b4496f5facec24f3651d3c84d9ad24b5973fb/contract';
import endContract from '../../snapshots/d7be26ba792b4b4052c9ece5e53b4496f5facec24f3651d3c84d9ad24b5973fb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'showtimeSeat',
        column: col('price', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
