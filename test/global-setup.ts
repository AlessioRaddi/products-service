import { MySqlContainer } from '@testcontainers/mysql';
import type { TestProject } from 'vitest/node';

const MYSQL_IMAGE = 'mysql:26.10';

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

declare module 'vitest' {
  export interface ProvidedContext {
    database: DatabaseConnection;
  }
}

export default async function setup(
  project: TestProject,
): Promise<() => Promise<void>> {
  const container = await new MySqlContainer(MYSQL_IMAGE).start();

  project.provide('database', {
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    username: container.getUsername(),
    password: container.getUserPassword(),
  });

  return async () => {
    await container.stop();
  };
}
