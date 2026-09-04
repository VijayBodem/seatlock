import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateShowtimeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsDateString()
  startsAt!: string;
}
