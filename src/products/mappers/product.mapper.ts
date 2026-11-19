import { ProductDto } from '../dto/product.dto.js';
import { Product } from '../models/product.model.js';
import { CreateProductDto } from '../dto/create-product.dto.js';
import type { CreationAttributes } from 'sequelize';

export class ProductMapper {
  static toDto(product: Product): ProductDto {
    return {
      id: product.id,
      productToken: product.productToken,
      name: product.name,
      price: product.price,
      stock: product.stock,
    };
  }

  static toDtos(products: Product[]): ProductDto[] {
    return products.map((product) => this.toDto(product));
  }

  static toModel(dto: CreateProductDto): CreationAttributes<Product> {
    return {
      productToken: dto.productToken,
      name: dto.name,
      price: dto.price,
      stock: dto.stock ?? 0,
    };
  }
}
