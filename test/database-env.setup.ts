import { inject } from 'vitest';

const database = inject('database');

process.env.DB_HOST = database.host;
process.env.DB_PORT = String(database.port);
process.env.DB_NAME = database.database;
process.env.DB_USERNAME = database.username;
process.env.DB_PASSWORD = database.password;
