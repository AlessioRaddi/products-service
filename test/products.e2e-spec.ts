import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { Sequelize } from 'sequelize-typescript';
import { Product } from '../src/products/models/product.model.js';
import { CreateProductDto } from '../src/products/dto/create-product.dto.js';
import { ProductDto } from '../src/products/dto/product.dto.js';
import { ErrorResponseDto } from '../src/filters/error-response.dto.js';
import { PaginatedResponseDto } from '../src/products/dto/paginated-response.dto.js';
import { UpdateStockDto } from '../src/products/dto/update-stock.dto.js';
import { ProductsService } from '../src/products/products.service.js';

describe('Products Service E2E', () => {
  let app: INestApplication<App>;
  let sequelize: Sequelize;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    sequelize = app.get(Sequelize);
    await sequelize.sync({ force: true });
  }, 15_000);

  beforeEach(async () => {
    await Product.destroy({ where: {}, truncate: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /products', () => {
    it('should create a new product and return 201', async () => {
      const createProductDto: CreateProductDto = {
        productToken: 'prod-tkn-001',
        name: 'Microwave',
        price: 199.99,
        stock: 4,
      };
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(201);
      const body: ProductDto = response.body;

      expect(body.id).toBeDefined();
      expect(body).toMatchObject({
        productToken: 'prod-tkn-001',
        name: 'Microwave',
        price: 199.99,
        stock: 4,
      });
    });

    it('should return http status 409 when creating a duplicated product token', async () => {
      const createProductDto: CreateProductDto = {
        productToken: 'prod-tkn-001',
        name: 'Microwave',
        price: 199.99,
        stock: 4,
      };
      const duplicatedProduct: CreateProductDto = {
        productToken: 'prod-tkn-001',
        name: 'Mixer',
        price: 39.99,
        stock: 2,
      };

      await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(201);
      const errorResponse = await request(app.getHttpServer())
        .post('/products')
        .send(duplicatedProduct)
        .expect(409);
      const body: ErrorResponseDto = errorResponse.body;

      expect(body).toMatchObject({
        messages: ['A product already exists with the specified token'],
        path: '/products',
        statusCode: 409,
      });
    });

    it('should return 400 when mandatory property is missing', async () => {
      const createProductDto: Partial<CreateProductDto> = {
        productToken: 'prod-tkn-001',
        name: 'Microwave',
        stock: 4,
      };
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(400);
      const body: ErrorResponseDto = response.body;

      expect(body).toMatchObject({
        statusCode: 400,
        path: '/products',
      } as ErrorResponseDto);
      expect(body.messages).toEqual(
        expect.arrayContaining([
          'price must be a number conforming to the specified constraints',
        ]),
      );
    });

    it('should return 400 when min validation fails', async () => {
      const createProductDto: Partial<CreateProductDto> = {
        productToken: 'prod-tkn-001',
        name: 'Microwave',
        price: -10,
        stock: 4,
      };
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(createProductDto)
        .expect(400);
      const body: ErrorResponseDto = response.body;

      expect(body).not.toBeNull();
      expect(body).toMatchObject({
        statusCode: 400,
        messages: ['price must not be less than 0'],
        path: '/products',
      } as ErrorResponseDto);
    });
  });

  describe('GET /products', () => {
    it('should retrieve the paginated list of products', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .send({
          productToken: 'prod-tkn-001',
          name: 'PC',
          price: 1234,
          stock: 4,
        } as CreateProductDto)
        .expect(201);
      await request(app.getHttpServer())
        .post('/products')
        .send({
          productToken: 'prod-tkn-002',
          name: 'iPhone',
          price: 2389,
          stock: 2,
        } as CreateProductDto)
        .expect(201);
      await request(app.getHttpServer())
        .post('/products')
        .send({
          productToken: 'prod-tkn-003',
          name: 'Apple Watch',
          price: 489,
          stock: 6,
        } as CreateProductDto)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, size: 2 })
        .expect(200);
      const body: PaginatedResponseDto<ProductDto> = response.body;

      expect(body).toMatchObject({
        content: [
          {
            productToken: 'prod-tkn-001',
            name: 'PC',
            price: 1234,
            stock: 4,
          } as ProductDto,
          {
            productToken: 'prod-tkn-002',
            name: 'iPhone',
            price: 2389,
            stock: 2,
          } as ProductDto,
        ],
        meta: {
          page: 1,
          size: 2,
          hasNextPage: true,
          hasPreviousPage: false,
          totalPages: 2,
          totalItems: 3,
        },
      } as PaginatedResponseDto<ProductDto>);
    });

    it('should return 500 if an unexpected error occurs', async () => {
      const productsService: ProductsService = app.get(ProductsService);
      vi.spyOn(productsService, 'findAllPaginated').mockRejectedValueOnce(
        new Error('Database connection lost'),
      );
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(500);
      const body: ErrorResponseDto = response.body;

      expect(body).toMatchObject({
        statusCode: 500,
        messages: ['Internal Server Error'],
        path: '/products',
      } as ErrorResponseDto);
    });
  });

  describe('GET /products/:id', () => {
    it('should retrieve the product specified in the path', async () => {
      const createProductResponse = await request(app.getHttpServer())
        .post('/products')
        .send({
          productToken: 'prod-tkn-321',
          name: 'TV',
          price: 899.99,
          stock: 2,
        } as CreateProductDto)
        .expect(201);
      const createProduct: ProductDto = createProductResponse.body;

      const response = await request(app.getHttpServer())
        .get(`/products/${createProduct.id}`)
        .expect(200);
      const body: ProductDto = response.body;

      expect(body).toMatchObject({
        productToken: 'prod-tkn-321',
        name: 'TV',
        price: 899.99,
        stock: 2,
      } as ProductDto);
    });

    it('should return status 404 when product does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/1')
        .expect(404);
      const body: ErrorResponseDto = response.body;

      expect(body).toMatchObject({
        messages: ['Product with id: 1 not found'],
        path: '/products/1',
        statusCode: 404,
      } as ErrorResponseDto);
    });

    it('should return error 400 when id in path is not a number', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/a')
        .expect(400);
      const body: ErrorResponseDto = response.body;

      expect(body).toMatchObject({
        messages: ['Specified product id is not a valid number'],
        path: '/products/a',
        statusCode: 400,
      } as ErrorResponseDto);
    });
  });

  describe('PATCH /products/:id', () => {
    it("should update product's stock and return the updated product", async () => {
      const createProductResponse = await request(app.getHttpServer())
        .post('/products')
        .send({
          productToken: 'prod-tkn-321',
          name: 'PROD-1',
          price: 90,
          stock: 2,
        } as CreateProductDto)
        .expect(201);
      const createProduct: ProductDto = createProductResponse.body;

      const response = await request(app.getHttpServer())
        .patch(`/products/${createProduct.id}`)
        .send({ amount: 10 } as UpdateStockDto)
        .expect(200);
      const body: ProductDto = response.body;

      expect(body).toMatchObject({
        name: 'PROD-1',
        productToken: 'prod-tkn-321',
        price: 90,
        stock: 12,
      } as ProductDto);
    });

    it("should not update product's stock when it's lower than the amount", async () => {
      const createProductResponse = await request(app.getHttpServer())
        .post('/products')
        .send({
          productToken: 'prod-tkn-532',
          name: 'PROD-532',
          price: 90,
          stock: 2,
        } as CreateProductDto)
        .expect(201);
      const createProduct: ProductDto = createProductResponse.body;

      const response = await request(app.getHttpServer())
        .patch(`/products/${createProduct.id}`)
        .send({ amount: -10 } as UpdateStockDto)
        .expect(422);
      const body: ErrorResponseDto = response.body;

      expect(body).toMatchObject({
        messages: [
          'Insufficient stock available for product with token: prod-tkn-532',
        ],
        path: `/products/${createProduct.id}`,
        statusCode: 422,
      } as ErrorResponseDto);
    });

    it("should not update product's stock when product does not exist", async () => {
      const response = await request(app.getHttpServer())
        .patch('/products/1')
        .send({ amount: -10 } as UpdateStockDto)
        .expect(404);
      const body: ErrorResponseDto = response.body;

      expect(body).toMatchObject({
        messages: ['Product with id: 1 not found'],
        path: '/products/1',
        statusCode: 404,
      } as ErrorResponseDto);
    });

    it('should return error 400 when id in path is not a number', async () => {
      const response = await request(app.getHttpServer())
        .patch('/products/a')
        .send({ amount: -10 } as UpdateStockDto)
        .expect(400);
      const body: ErrorResponseDto = response.body;

      expect(body).toMatchObject({
        messages: ['Specified product id is not a valid number'],
        path: '/products/a',
        statusCode: 400,
      } as ErrorResponseDto);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete the product specified in the path', async () => {
      const createProductResponse = await request(app.getHttpServer())
        .post('/products')
        .send({
          productToken: 'prod-tkn-532',
          name: 'PROD-532',
          price: 90,
          stock: 2,
        } as CreateProductDto)
        .expect(201);
      const createProduct: ProductDto = createProductResponse.body;

      const response = await request(app.getHttpServer())
        .delete(`/products/${createProduct.id}`)
        .expect(204);

      expect(response.body).toEqual({});
    });

    it('should return error 404 when product does not exist', async () => {
      const response = await request(app.getHttpServer())
        .delete('/products/1')
        .expect(404);
      const body: ErrorResponseDto = response.body;

      expect(body).not.toBeNull();
      expect(body).toMatchObject({
        statusCode: 404,
        messages: ['Product with id: 1 not found'],
        path: '/products/1',
      } as ErrorResponseDto);
    });

    it('should return error 400 when id in path is not a number', async () => {
      const response = await request(app.getHttpServer())
        .delete('/products/a')
        .expect(400);
      const body: ErrorResponseDto = response.body;

      expect(body).toMatchObject({
        messages: ['Specified product id is not a valid number'],
        path: '/products/a',
        statusCode: 400,
      } as ErrorResponseDto);
    });
  });
});
