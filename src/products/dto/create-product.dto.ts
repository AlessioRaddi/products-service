import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(1, 50)
  productToken: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99_999_999.99)
  price: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(2_147_483_647)
  stock?: number;
}
