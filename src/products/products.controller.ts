import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ProductDto } from './dto/product.dto.js';
import { PaginatedResponseDto } from './dto/paginated-response.dto.js';
import { IntegerValidationPipe } from '../common/pipes/integer-validation.pipe.js';
import { UpdateStockDto } from './dto/update-stock.dto.js';
import { PaginationFilterDto } from '../common/dto/pagination-filter.dto.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  createProduct(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductDto> {
    return this.productsService.createProduct(createProductDto);
  }

  @Get()
  getProducts(
    @Query() paginationFilter: PaginationFilterDto,
  ): Promise<PaginatedResponseDto<ProductDto>> {
    return this.productsService.findAllPaginated(
      paginationFilter.page,
      paginationFilter.size,
    );
  }

  @Get(':id')
  getProduct(
    @Param('id', new IntegerValidationPipe('product id')) id: number,
  ): Promise<ProductDto> {
    return this.productsService.findProductById(id);
  }

  @Patch(':id')
  updateStock(
    @Param('id', new IntegerValidationPipe('product id')) id: number,
    @Body() updateStockDto: UpdateStockDto,
  ): Promise<ProductDto> {
    return this.productsService.updateStock(id, updateStockDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProduct(
    @Param('id', new IntegerValidationPipe('product id')) id: number,
  ): Promise<void> {
    return this.productsService.deleteProductById(id);
  }
}
