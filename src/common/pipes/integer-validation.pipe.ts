import { BadRequestException, ParseIntPipe } from '@nestjs/common';

export class IntegerValidationPipe extends ParseIntPipe {
  constructor(fieldName: string) {
    super({
      exceptionFactory: () =>
        new BadRequestException(`Specified ${fieldName} is not a valid number`),
    });
  }
}
