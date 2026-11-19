import {
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';

export const MAX_STOCK = 2_147_483_647;

@Table({
  tableName: 'products',
  underscored: true,
  timestamps: false,
})
export class Product extends Model<
  InferAttributes<Product>,
  InferCreationAttributes<Product>
> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  declare id: CreationOptional<number>;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: {
      name: 'unique_product_token',
      msg: 'A product already exists with the specified token',
    },
  })
  declare productToken: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare name: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    get(this: Product): number {
      return Number(this.getDataValue('price'));
    },
  })
  declare price: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare stock: CreationOptional<number>;
}
