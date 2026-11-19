import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { SequelizeModule } from '@nestjs/sequelize';
import { Product } from './models/product.model.js';
import { ProductsRepository } from './repositories/products.repository.js';
import { ProductsService } from './products.service.js';

@Module({
  imports: [SequelizeModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
})
export class ProductsModule {}
