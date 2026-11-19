import { ProductsService } from './products.service.js';
import { ProductsRepository } from './repositories/products.repository.js';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { PaginatedResponseDto } from './dto/paginated-response.dto.js';
import { ProductDto } from './dto/product.dto.js';
import { Product } from './models/product.model.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { Transaction, UniqueConstraintError } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UpdateStockDto } from './dto/update-stock.dto.js';

describe('ProductsService', () => {
  let service: ProductsService;
  const transaction = {} as Transaction;

  const createProduct = vi.fn<ProductsRepository['createProduct']>();
  const findAllPaginated = vi.fn<ProductsRepository['findAllPaginated']>();
  const findById = vi.fn<ProductsRepository['findById']>();
  const updateStockById = vi.fn<ProductsRepository['updateStockById']>();
  const deleteById = vi.fn<ProductsRepository['deleteById']>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: ProductsRepository,
          useValue: {
            createProduct,
            findAllPaginated,
            findById,
            updateStockById,
            deleteById,
          },
        },
        {
          provide: Sequelize,
          useValue: {
            transaction: vi.fn(
              (callback: (t: Transaction) => Promise<unknown>) =>
                callback(transaction),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createProduct', () => {
    it('should create a new product and map the saved product to a DTO', async () => {
      const productId: number = 1;
      const model: Product = mockedProduct(productId);

      const createProductDto: CreateProductDto = {
        productToken: 'tok_123',
        name: 'Mechanical Keyboard',
        price: 129.99,
        stock: 2,
      };

      createProduct.mockResolvedValue(model);

      const result = await service.createProduct(createProductDto);
      const expectedProduct: ProductDto = mockedProductDto(productId);

      expect(createProduct).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedProduct);
    });

    it('should propagate UniqueConstraintError when repository fails to insert a new product', async () => {
      const createProductDto: CreateProductDto = {
        productToken: 'tok_123',
        name: 'Mechanical Keyboard',
        price: 129.99,
        stock: 2,
      };

      createProduct.mockRejectedValue(new UniqueConstraintError({}));

      await expect(service.createProduct(createProductDto)).rejects.toThrow(
        UniqueConstraintError,
      );
      expect(createProduct).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAllPaginated', () => {
    it('should return the paginated list of products retrieved from the DB', async () => {
      const page: number = 1;
      const size: number = 25;
      const productId: number = 1;
      const model: { rows: Product[]; count: number } = {
        rows: [mockedProduct(productId)],
        count: 1,
      };

      findAllPaginated.mockResolvedValue(model);

      const result = await service.findAllPaginated(page, size);
      const expectedResult: PaginatedResponseDto<ProductDto> = {
        content: [mockedProductDto(productId)],
        meta: {
          page: page,
          size: size,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      expect(findAllPaginated).toHaveBeenCalledTimes(1);
      expect(findAllPaginated).toHaveBeenCalledWith((page - 1) * size, size);
      expect(result).toEqual(expectedResult);
    });

    it('should compute the offset from page and size when requesting a page after the first', async () => {
      const page: number = 3;
      const size: number = 10;
      const productId: number = 21;

      findAllPaginated.mockResolvedValue({
        rows: [mockedProduct(productId)],
        count: 21,
      });

      const result = await service.findAllPaginated(page, size);

      expect(findAllPaginated).toHaveBeenCalledWith(20, size);
      expect(result.meta).toEqual({
        page,
        size,
        totalItems: 21,
        totalPages: 3,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('findProductById', () => {
    it('should map the product retrieved from the DB to a DTO', async () => {
      const productId: number = 1;
      const model: Product = mockedProduct(productId);

      findById.mockResolvedValue(model);

      const result = await service.findProductById(productId);
      const dto: ProductDto = mockedProductDto(productId);

      expect(findById).toHaveBeenCalledTimes(1);
      expect(findById).toHaveBeenCalledWith(productId);
      expect(result).toEqual(dto);
    });

    it('should throw NotFoundException if repository does not return the product', async () => {
      const productId: number = 99;

      findById.mockResolvedValue(null);

      await expect(service.findProductById(productId)).rejects.toThrow(
        new NotFoundException(`Product with id: ${productId} not found`),
      );
    });
  });

  describe('updateStock', () => {
    it("should update the product's stock", async () => {
      const productId: number = 1;
      const dto: UpdateStockDto = {
        amount: 2,
      };
      const model: Product = mockedProduct(productId);

      updateStockById.mockResolvedValue(1);
      findById.mockResolvedValue(model);

      const result = await service.updateStock(productId, dto);
      const expectedResult: ProductDto = mockedProductDto(productId);

      expect(findById).toHaveBeenCalledWith(productId, transaction);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(updateStockById).toHaveBeenCalledWith(
        productId,
        dto.amount,
        transaction,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException if repository does not return the product', async () => {
      const productId: number = 1;
      const dto: UpdateStockDto = {
        amount: 2,
      };

      updateStockById.mockResolvedValue(0);
      findById.mockResolvedValue(null);

      await expect(service.updateStock(productId, dto)).rejects.toThrow(
        new NotFoundException(`Product with id: ${productId} not found`),
      );
      expect(findById).toHaveBeenCalledWith(productId, transaction);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(updateStockById).toHaveBeenCalledWith(
        productId,
        dto.amount,
        transaction,
      );
    });

    it('should throw UnprocessableEntityException when the stock is insufficient', async () => {
      const productId: number = 1;
      const dto: UpdateStockDto = {
        amount: -2,
      };
      const model: Product = mockedProduct(productId);

      updateStockById.mockResolvedValue(0);
      findById.mockResolvedValue(model);

      await expect(service.updateStock(productId, dto)).rejects.toThrow(
        new UnprocessableEntityException(
          `Insufficient stock available for product with token: ${model.productToken}`,
        ),
      );
      expect(findById).toHaveBeenCalledWith(productId, transaction);
      expect(findById).toHaveBeenCalledTimes(1);
      expect(updateStockById).toHaveBeenCalledWith(
        productId,
        dto.amount,
        transaction,
      );
    });

    it('should throw UnprocessableEntityException when the increment exceeds the maximum stock', async () => {
      const productId: number = 1;
      const dto: UpdateStockDto = {
        amount: 2,
      };
      const model: Product = mockedProduct(productId);

      updateStockById.mockResolvedValue(0);
      findById.mockResolvedValue(model);

      await expect(service.updateStock(productId, dto)).rejects.toThrow(
        new UnprocessableEntityException(
          `Maximum stock exceeded for product with token: ${model.productToken}`,
        ),
      );
    });
  });

  describe('deleteProductById', () => {
    it('should delete the specified product', async () => {
      const productId: number = 1;

      deleteById.mockResolvedValue(1);

      await expect(
        service.deleteProductById(productId),
      ).resolves.toBeUndefined();
      expect(deleteById).toHaveBeenCalledTimes(1);
      expect(deleteById).toHaveBeenCalledWith(productId);
    });

    it('should throw NotFoundException if repository does not return the product', async () => {
      const productId: number = 99;

      deleteById.mockResolvedValue(0);

      await expect(service.deleteProductById(productId)).rejects.toThrow(
        new NotFoundException(`Product with id: ${productId} not found`),
      );
    });
  });

  const mockedProduct = (productId: number): Product => {
    return {
      id: productId,
      productToken: 'tok_123',
      name: 'Mechanical Keyboard',
      price: 129.99,
      stock: 2,
    } as Product;
  };

  const mockedProductDto = (productId: number): ProductDto => {
    return {
      id: productId,
      productToken: 'tok_123',
      name: 'Mechanical Keyboard',
      price: 129.99,
      stock: 2,
    } as ProductDto;
  };
});
