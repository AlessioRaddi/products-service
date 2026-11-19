import { Test, TestingModule } from '@nestjs/testing';
import { ProductsRepository } from '../src/products/repositories/products.repository.js';
import { Sequelize } from 'sequelize-typescript';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../src/database/database.module.js';
import { SequelizeModule } from '@nestjs/sequelize';
import { MAX_STOCK, Product } from '../src/products/models/product.model.js';
import { CreationAttributes, UniqueConstraintError } from 'sequelize';

describe('ProductsRepository', () => {
  let module: TestingModule;
  let repository: ProductsRepository;
  let sequelize: Sequelize;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        DatabaseModule,
        SequelizeModule.forFeature([Product]),
      ],
      providers: [ProductsRepository],
    }).compile();

    repository = module.get<ProductsRepository>(ProductsRepository);
    sequelize = module.get<Sequelize>(Sequelize);

    await sequelize.sync({ force: true });
  }, 10_000);

  beforeEach(async () => {
    await Product.destroy({ where: {}, truncate: true });
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('createProduct', () => {
    it('should persist a product correctly', async () => {
      const model: CreationAttributes<Product> = {
        productToken: 'prod-tkn-001',
        name: 'Laptop',
        price: 899.95,
        stock: 4,
      };

      const created = await repository.createProduct(model);

      expect(created.id).toBeDefined();
      expect(created.productToken).toBe('prod-tkn-001');
      expect(created.name).toBe('Laptop');
      expect(created.price).toBe(899.95);
      expect(created.stock).toBe(4);
    });

    it('should throw UniqueConstraintError when inserting an existing product token', async () => {
      await repository.createProduct({
        productToken: 'prod-tkn-001',
        name: 'Laptop',
        price: 899.95,
        stock: 4,
      });
      await expect(
        repository.createProduct({
          productToken: 'prod-tkn-001',
          name: 'Headphones',
          price: 100,
          stock: 10,
        }),
      ).rejects.toThrow(UniqueConstraintError);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated records and total count ordered by id ASC', async () => {
      await repository.createProduct({
        productToken: 'prod-tkn-001',
        name: 'P1',
        price: 10,
        stock: 1,
      });
      await repository.createProduct({
        productToken: 'prod-tkn-002',
        name: 'P2',
        price: 20,
        stock: 2,
      });
      await repository.createProduct({
        productToken: 'prod-tkn-003',
        name: 'P3',
        price: 30,
        stock: 3,
      });

      const page = await repository.findAllPaginated(1, 2);

      expect(page.count).toBe(3);
      expect(page.rows).toHaveLength(2);
      expect(page.rows.map((product) => product.productToken)).toEqual([
        'prod-tkn-002',
        'prod-tkn-003',
      ]);
    });
  });

  describe('findById', () => {
    it('should return the product associated with the specified id', async () => {
      const createdProduct: Product = await repository.createProduct({
        productToken: 'prod-tkn-001',
        name: 'P1',
        price: 10,
        stock: 1,
      });

      const product: Product | null = await repository.findById(
        createdProduct.id,
      );

      expect(product).not.toBeNull();
      assert.isNotNull(product);
      expect(product.id).toBe(createdProduct.id);
      expect(product.productToken).toBe(createdProduct.productToken);
      expect(product.name).toBe(createdProduct.name);
      expect(product.price).toBe(createdProduct.price);
      expect(product.stock).toBe(createdProduct.stock);
    });

    it('should return null when the product does not exist', async () => {
      const product: Product | null = await repository.findById(1);
      expect(product).toBeNull();
    });
  });

  describe('updateStockById', () => {
    it("should increment product's stock correctly", async () => {
      const createdProduct: Product = await repository.createProduct({
        productToken: 'prod-tkn-001',
        name: 'P1',
        price: 10,
        stock: 1,
      });

      const affectedCount = await repository.updateStockById(
        createdProduct.id,
        5,
      );
      const updatedProduct = await repository.findById(createdProduct.id);

      expect(affectedCount).toBe(1);
      expect(updatedProduct).not.toBeNull();
      assert.isNotNull(updatedProduct);
      expect(updatedProduct.stock).toBe(6);
    });

    it("should decrement the product's stock when it covers the amount", async () => {
      const createdProduct: Product = await repository.createProduct({
        productToken: 'prod-tkn-001',
        name: 'P1',
        price: 10,
        stock: 5,
      });

      const affectedCount = await repository.updateStockById(
        createdProduct.id,
        -5,
      );
      const updatedProduct = await repository.findById(createdProduct.id);

      expect(affectedCount).toBe(1);
      assert.isNotNull(updatedProduct);
      expect(updatedProduct.stock).toBe(0);
    });

    it('should return 0 updated rows when the product does not exist', async () => {
      const affectedCount = await repository.updateStockById(1, 5);

      expect(affectedCount).toBe(0);
    });

    it("should not update product's stock if amount is higher than the stock", async () => {
      const createdProduct: Product = await repository.createProduct({
        productToken: 'prod-tkn-001',
        name: 'P1',
        price: 10,
        stock: 1,
      });

      const affectedCount = await repository.updateStockById(
        createdProduct.id,
        -5,
      );
      const updatedProduct = await repository.findById(createdProduct.id);

      expect(affectedCount).toBe(0);
      expect(updatedProduct).not.toBeNull();
      assert.isNotNull(updatedProduct);
      expect(updatedProduct.stock).toBe(1);
    });

    it("should not update product's stock if the increment would exceed the maximum stock", async () => {
      const createdProduct: Product = await repository.createProduct({
        productToken: 'prod-tkn-001',
        name: 'P1',
        price: 10,
        stock: MAX_STOCK - 1,
      });

      const affectedCount = await repository.updateStockById(
        createdProduct.id,
        2,
      );
      const updatedProduct = await repository.findById(createdProduct.id);

      expect(affectedCount).toBe(0);
      assert.isNotNull(updatedProduct);
      expect(updatedProduct.stock).toBe(MAX_STOCK - 1);
    });

    it('should increment the stock up to the maximum value', async () => {
      const createdProduct: Product = await repository.createProduct({
        productToken: 'prod-tkn-001',
        name: 'P1',
        price: 10,
        stock: MAX_STOCK - 1,
      });

      const affectedCount = await repository.updateStockById(
        createdProduct.id,
        1,
      );
      const updatedProduct = await repository.findById(createdProduct.id);

      expect(affectedCount).toBe(1);
      assert.isNotNull(updatedProduct);
      expect(updatedProduct.stock).toBe(MAX_STOCK);
    });
  });

  describe('deleteById', () => {
    it('should delete the product from the database', async () => {
      const createdProduct: Product = await repository.createProduct({
        productToken: 'prod-tkn-001',
        name: 'P1',
        price: 10,
        stock: 1,
      });

      const rows: number = await repository.deleteById(createdProduct.id);
      const product: Product | null = await repository.findById(
        createdProduct.id,
      );

      expect(rows).toBe(1);
      expect(product).toBeNull();
    });

    it('should return 0 when the product does not exist', async () => {
      const rows: number = await repository.deleteById(1);

      expect(rows).toBe(0);
    });
  });
});
