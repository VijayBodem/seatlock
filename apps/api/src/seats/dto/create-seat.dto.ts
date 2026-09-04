import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum SeatType {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ACCESSIBLE = 'ACCESSIBLE',
}

export class CreateSeatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  row!: string;

  @IsInt()
  @Min(1)
  number!: number;

  @IsEnum(SeatType)
  type!: SeatType;
}
