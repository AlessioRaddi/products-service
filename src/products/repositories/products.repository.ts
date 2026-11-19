import { Injectable } from '@nestjs/common';
import { MAX_STOCK, Product } from '../models/product.model.js';
import { InjectModel } from '@nestjs/sequelize';
import {
  Attributes,
  CreationAttributes,
  literal,
  Op,
  Transaction,
  WhereOptions,
} from 'sequelize';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectModel(Product) private readonly productModel: typeof Product,
  ) {}

  createProduct(product: CreationAttributes<Product>): Promise<Product> {
    return this.productModel.create(product);
  }

  findAllPaginated(
    offset: number,
    size: number,
  ): Promise<{ rows: Product[]; count: number }> {
    return this.productModel.findAndCountAll({
      offset,
      limit: size,
      order: [['id', 'ASC']],
    });
  }

  findById(id: number, transaction?: Transaction): Promise<Product | null> {
    return this.productModel.findByPk(id, { transaction });
  }

  async updateStockById(
    id: number,
    amount: number,
    transaction?: Transaction,
  ): Promise<number> {
    const whereCondition: WhereOptions<Attributes<Product>> = { id };

    whereCondition.stock =
      amount < 0
        ? { [Op.gte]: Math.abs(amount) }
        : { [Op.lte]: MAX_STOCK - amount };

    const [affectedCount] = await this.productModel.update(
      { stock: literal(`stock + ${amount}`) },
      { where: whereCondition, transaction },
    );

    return affectedCount;
  }

  deleteById(id: number): Promise<number> {
    return this.productModel.destroy({ where: { id } });
  }
}
