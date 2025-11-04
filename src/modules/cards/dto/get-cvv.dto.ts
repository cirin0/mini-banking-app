import { IsNotEmpty } from 'class-validator';

export class GetCvvDto {
  @IsNotEmpty()
  password: string;
}
