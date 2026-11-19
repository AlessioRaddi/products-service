import { IsInt, Max, Min, NotEquals } from 'class-validator';

export class UpdateStockDto {
  @IsInt({ message: 'Amount must be an integer' })
  @NotEquals(0, { message: 'Amount cannot be zero' })
  @Min(-2_147_483_647)
  @Max(2_147_483_647)
  amount: number;
}
