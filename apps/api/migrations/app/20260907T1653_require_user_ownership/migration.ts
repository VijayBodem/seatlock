#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7112442249cea7d8e057c32d457a8d9f7c55b06840a0b3abedb5018124488b3e/contract';
import endContract from '../../snapshots/7112442249cea7d8e057c32d457a8d9f7c55b06840a0b3abedb5018124488b3e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9daa71bd0932465d53131f5346399e09a60d68d33c42dbb87a03847e34ae87e0/contract';
import startContract from '../../snapshots/9daa71bd0932465d53131f5346399e09a60d68d33c42dbb87a03847e34ae87e0/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setNotNull({
        schema: 'public',
        table: 'booking',
        column: 'userId',
      }),
      this.setNotNull({
        schema: 'public',
        table: 'seatHold',
        column: 'userId',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);