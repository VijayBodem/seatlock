import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVenueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
