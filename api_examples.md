# Usage examples

Sample requests and responses for every endpoint of `products-service`. All the responses below are real: they were captured running the app against a MySQL database named `ecommerce`, starting from an empty `products` table.

Base URL: `http://localhost:3000`

## Create a product

`POST /products`

```bash
curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' \
  -d '{"productToken":"PROD-001","name":"Mechanical Keyboard","price":89.99,"stock":25}'
```

`201 Created`

```json
{
  "id": 1,
  "productToken": "PROD-001",
  "name": "Mechanical Keyboard",
  "price": 89.99,
  "stock": 25
}
```

`stock` is optional, if you don't send it the product is created with stock 0:

```bash
curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' \
  -d '{"productToken":"PROD-002","name":"Wireless Mouse","price":49.5}'
```

`201 Created`

```json
{
  "id": 2,
  "productToken": "PROD-002",
  "name": "Wireless Mouse",
  "price": 49.5,
  "stock": 0
}
```

For the next examples a third product was created too: `PROD-003`, "USB-C Hub", price 35, stock 10.

## List products

`GET /products?page=<page>&size=<size>`

`page` starts from 1 (default 1), `size` goes from 1 to 100 (default 25). Products are ordered by id.

```bash
curl 'http://localhost:3000/products?page=1&size=2'
```

`200 OK`

```json
{
  "content": [
    {
      "id": 1,
      "productToken": "PROD-001",
      "name": "Mechanical Keyboard",
      "price": 89.99,
      "stock": 25
    },
    {
      "id": 2,
      "productToken": "PROD-002",
      "name": "Wireless Mouse",
      "price": 49.5,
      "stock": 0
    }
  ],
  "meta": {
    "page": 1,
    "size": 2,
    "totalItems": 3,
    "totalPages": 2,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

## Get a product

`GET /products/:id`

```bash
curl http://localhost:3000/products/1
```

`200 OK`

```json
{
  "id": 1,
  "productToken": "PROD-001",
  "name": "Mechanical Keyboard",
  "price": 89.99,
  "stock": 25
}
```

## Update the stock

`PATCH /products/:id`

The body has an `amount` that is added to the current stock. A positive amount increases the stock, a negative one decreases it.

```bash
curl -X PATCH http://localhost:3000/products/1 \
  -H 'Content-Type: application/json' \
  -d '{"amount":-5}'
```

`200 OK`

```json
{
  "id": 1,
  "productToken": "PROD-001",
  "name": "Mechanical Keyboard",
  "price": 89.99,
  "stock": 20
}
```

```bash
curl -X PATCH http://localhost:3000/products/1 \
  -H 'Content-Type: application/json' \
  -d '{"amount":10}'
```

`200 OK`

```json
{
  "id": 1,
  "productToken": "PROD-001",
  "name": "Mechanical Keyboard",
  "price": 89.99,
  "stock": 30
}
```

## Delete a product

`DELETE /products/:id`

```bash
curl -X DELETE http://localhost:3000/products/2
```

`204 No Content`, with an empty body.

## Errors

All the errors have the same shape: `statusCode`, `timestamp`, `path` and `messages`. `messages` is always a list of strings, also when there is only one error.

### 400: invalid body

```bash
curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' \
  -d '{"productToken":"PROD-004","name":"Monitor","price":-10,"stock":1.5}'
```

```json
{
  "statusCode": 400,
  "timestamp": "2026-11-19T13:38:22.629Z",
  "path": "/products",
  "messages": [
    "price must not be less than 0",
    "stock must be an integer number"
  ]
}
```

### 400: unknown field

Fields that are not part of the request are rejected:

```bash
curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' \
  -d '{"productToken":"PROD-005","name":"Webcam","price":59.9,"color":"black"}'
```

```json
{
  "statusCode": 400,
  "timestamp": "2026-11-19T13:38:22.637Z",
  "path": "/products",
  "messages": [
    "property color should not exist"
  ]
}
```

### 400: invalid pagination

```bash
curl 'http://localhost:3000/products?page=0&size=500'
```

```json
{
  "statusCode": 400,
  "timestamp": "2026-11-19T13:38:22.656Z",
  "path": "/products?page=0&size=500",
  "messages": [
    "page must not be less than 1",
    "size must not be greater than 100"
  ]
}
```

### 400: id is not a number

```bash
curl http://localhost:3000/products/abc
```

```json
{
  "statusCode": 400,
  "timestamp": "2026-11-19T13:38:22.680Z",
  "path": "/products/abc",
  "messages": [
    "Specified product id is not a valid number"
  ]
}
```

### 400: amount is zero

```bash
curl -X PATCH http://localhost:3000/products/1 \
  -H 'Content-Type: application/json' \
  -d '{"amount":0}'
```

```json
{
  "statusCode": 400,
  "timestamp": "2026-11-19T13:38:22.721Z",
  "path": "/products/1",
  "messages": [
    "Amount cannot be zero"
  ]
}
```

### 404: product not found

The same response is returned by `GET`, `PATCH` and `DELETE` when the id doesn't exist.

```bash
curl http://localhost:3000/products/999
```

```json
{
  "statusCode": 404,
  "timestamp": "2026-11-19T13:38:22.673Z",
  "path": "/products/999",
  "messages": [
    "Product with id: 999 not found"
  ]
}
```

### 409: product token already used

```bash
curl -X POST http://localhost:3000/products \
  -H 'Content-Type: application/json' \
  -d '{"productToken":"PROD-001","name":"Another Keyboard","price":99.99,"stock":5}'
```

```json
{
  "statusCode": 409,
  "timestamp": "2026-11-19T13:38:22.620Z",
  "path": "/products",
  "messages": [
    "A product already exists with the specified token"
  ]
}
```

### 422: not enough stock

`PROD-003` has stock 10, so it's not possible to remove 50:

```bash
curl -X PATCH http://localhost:3000/products/3 \
  -H 'Content-Type: application/json' \
  -d '{"amount":-50}'
```

```json
{
  "statusCode": 422,
  "timestamp": "2026-11-19T13:38:22.714Z",
  "path": "/products/3",
  "messages": [
    "Insufficient stock available for product with token: PROD-003"
  ]
}
```

If an increase would go over the max value of the `stock` column (2147483647), the API returns 422 with the message `Maximum stock exceeded for product with token: <token>`.
