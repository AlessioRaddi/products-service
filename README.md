# products-service

Service for managing products and their stock. Built with NestJS, Sequelize and MySQL.

## Requirements

- Node.js (developed with v26) and npm
- A running MySQL with an empty database called `ecommerce`
- Docker, only for the integration and e2e tests

## Setup

```bash
npm install
```

Create the database if it doesn't exist (the app creates the table, not the database):

```sql
CREATE DATABASE ecommerce;
```

The repository already contains a `.env` file with the DB connection used for local tests. Change the values if your MySQL is different:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ecommerce
DB_USERNAME=root
DB_PASSWORD=<your password>
```

The app fails at startup if one of these is missing. The `products` table is created automatically when the app starts, there are no migrations. Don't create the table by hand.

## Run

```bash
npm run start:dev
```

The server listens on port 3000, you can change it with the `PORT` variable.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/products` | Create a product (`productToken`, `name`, `price`, optional `stock`) |
| GET | `/products?page=1&size=25` | List products, paginated (max size is 100) |
| GET | `/products/:id` | Get a product by id |
| PATCH | `/products/:id` | Update the stock, body is `{ "amount": n }`, n can be negative |
| DELETE | `/products/:id` | Delete a product |

If the stock is not enough for a negative amount, or it goes over the max value of the column, the API returns 422. Examples of requests and responses for every endpoint are in `api_examples.md`.

## Tests

```bash
npm test                  # unit tests, no Docker needed
npm run test:integration  # repository tests against MySQL (Testcontainers, needs Docker)
npm run test:e2e          # HTTP tests against MySQL (Testcontainers, needs Docker)
```

The integration and e2e tests start their own MySQL container, so they don't use the database in `.env`.
