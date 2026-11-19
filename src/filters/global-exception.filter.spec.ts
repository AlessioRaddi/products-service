import { GlobalExceptionFilter } from './global-exception.filter.js';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  UniqueConstraintError,
  ValidationError,
  ValidationErrorItem,
} from 'sequelize';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(async () => {
    filter = new GlobalExceptionFilter();
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockArgumentsHost = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/products' }),
        getResponse: () => ({ status: mockStatus }),
      }),
    } as ArgumentsHost;
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  it('should log the error message for 500 errors without sending it to the client', () => {
    const errorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const exception = new Error(
      "Field 'created_at' doesn't have a default value",
    );

    filter.catch(exception, mockArgumentsHost);

    expect(errorSpy).toHaveBeenCalledWith(
      "POST /products -> 500: Field 'created_at' doesn't have a default value",
      exception.stack,
    );
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        messages: ['Internal Server Error'],
      }),
    );
    errorSpy.mockRestore();
  });

  it('should map Sequelize UniqueConstraintError to ConflictException', async () => {
    const exception: UniqueConstraintError = new UniqueConstraintError({});

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        path: '/products',
      }),
    );
  });

  it('should map Sequelize ValidationError to BadRequestException', () => {
    const exception = new ValidationError('Validation error', [
      { message: 'Product.name cannot be null' } as ValidationErrorItem,
    ]);

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/products',
        messages: ['Product.name cannot be null'],
      }),
    );
  });

  it('should preserve status and message for standard HttpException', () => {
    const exception = new HttpException(
      'Product not found',
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        path: '/products',
        messages: ['Product not found'],
      }),
    );
  });

  it('should map unknown errors to 500 Internal Server Error', () => {
    const exception = new Error('Unexpected database crash');

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/products',
      }),
    );
  });
});
