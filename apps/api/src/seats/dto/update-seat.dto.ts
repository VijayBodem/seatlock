import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { SeatType } from './create-seat.dto.js';

export class UpdateSeatDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  row?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  number?: number;

  @IsOptional()
  @IsEnum(SeatType)
  type?: SeatType;
}
