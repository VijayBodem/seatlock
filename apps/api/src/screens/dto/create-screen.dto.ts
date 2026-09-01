import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateScreenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
