import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { ProductsRepository } from './repositories/products.repository.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductDto } from './dto/product.dto.js';
import { ProductMapper } from './mappers/product.mapper.js';
import { PaginatedResponseDto } from './dto/paginated-response.dto.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly sequelize: Sequelize,
  ) {}

  async createProduct(createProductDto: CreateProductDto): Promise<ProductDto> {
    const product = ProductMapper.toModel(createProductDto);
    const savedProduct = await this.productsRepository.createProduct(product);
    return ProductMapper.toDto(savedProduct);
  }

  async findAllPaginated(
    page: number,
    size: number,
  ): Promise<PaginatedResponseDto<ProductDto>> {
    const offset = (page - 1) * size;
    const { rows, count } = await this.productsRepository.findAllPaginated(
      offset,
      size,
    );
    const productDtos = ProductMapper.toDtos(rows);
    return new PaginatedResponseDto<ProductDto>(productDtos, page, size, count);
  }

  async findProductById(id: number): Promise<ProductDto> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with id: ${id} not found`);
    }

    return ProductMapper.toDto(product);
  }

  updateStock(id: number, updateStockDto: UpdateStockDto): Promise<ProductDto> {
    return this.sequelize.transaction(async (transaction) => {
      const affectedCount = await this.productsRepository.updateStockById(
        id,
        updateStockDto.amount,
        transaction,
      );
      const product = await this.productsRepository.findById(id, transaction);

      if (!product) {
        throw new NotFoundException(`Product with id: ${id} not found`);
      }

      if (affectedCount === 0) {
        const reason =
          updateStockDto.amount < 0
            ? 'Insufficient stock available'
            : 'Maximum stock exceeded';

        throw new UnprocessableEntityException(
          `${reason} for product with token: ${product.productToken}`,
        );
      }

      return ProductMapper.toDto(product);
    });
  }

  async deleteProductById(id: number): Promise<void> {
    const deletedRows = await this.productsRepository.deleteById(id);

    if (deletedRows === 0) {
      throw new NotFoundException(`Product with id: ${id} not found`);
    }
  }
}
