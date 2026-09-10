#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4853dd79dc190f81495b36848e13a88b2d9c95eae74037afda849242c92c259c/contract';
import endContract from '../../snapshots/4853dd79dc190f81495b36848e13a88b2d9c95eae74037afda849242c92c259c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d7be26ba792b4b4052c9ece5e53b4496f5facec24f3651d3c84d9ad24b5973fb/contract';
import startContract from '../../snapshots/d7be26ba792b4b4052c9ece5e53b4496f5facec24f3651d3c84d9ad24b5973fb/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'backfill.showtimeSeat.price',
        label: 'Backfill showtime seat prices',
        operationClass: 'data',
        target: {
          id: 'postgres',
        },
        precheck: [
          {
            description: 'check for showtime seats without prices',
            sql: `
              SELECT EXISTS (
                SELECT 1
                FROM "public"."showtimeSeat"
                WHERE "price" IS NULL
              ) AS ok
            `,
          },
        ],
        execute: [
          {
            description: 'backfill showtime seat prices from seat type',
            sql: `
              UPDATE "public"."showtimeSeat" AS ss
              SET "price" =
                CASE s."type"
                  WHEN 'PREMIUM' THEN 35000
                  WHEN 'STANDARD' THEN 20000
                  WHEN 'ACCESSIBLE' THEN 20000
                END
              FROM "public"."seat" AS s
              WHERE ss."seatId" = s."id"
                AND ss."price" IS NULL
            `,
          },
        ],
        postcheck: [
          {
            description: 'verify all showtime seats have prices',
            sql: `
              SELECT NOT EXISTS (
                SELECT 1
                FROM "public"."showtimeSeat"
                WHERE "price" IS NULL
              ) AS ok
            `,
          },
        ],
      }),

      this.setNotNull({
        schema: 'public',
        table: 'showtimeSeat',
        column: 'price',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);