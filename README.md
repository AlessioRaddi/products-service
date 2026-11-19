# products-service

Service for managing products and their stock. Built with NestJS, Sequelize and MySQL.

## Setup

Create a `.env` file in the root with the DB connection:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ecommerce
DB_USERNAME=root
DB_PASSWORD=secret
```

The app fails at startup if one of these is missing. The `products` table is created automatically when the app starts, there are no migrations.

## Run

```bash
npm run start:dev
```

The server listens on default port (3000).

## API

| Method | Path | Description |
|---|---|---|
| POST | `/products` | Create a product (`productToken`, `name`, `price`, optional `stock`) |
| GET | `/products?page=1&size=25` | List products, paginated (max size is 100) |
| GET | `/products/:id` | Get a product by id |
| PATCH | `/products/:id` | Update the stock, body is `{ "amount": n }`, n can be negative |
| DELETE | `/products/:id` | Delete a product |

If the stock is not enough for a negative amount, or it goes over the max value of the column, the API returns 422.

## Tests

```bash
npm test                  # unit tests
npm run test:integration  # repository tests against MySQL (Testcontainers)
npm run test:e2e          # HTTP tests against MySQL (Testcontainers)
```
