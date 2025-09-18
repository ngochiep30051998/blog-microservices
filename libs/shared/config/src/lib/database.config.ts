export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export const getDatabaseConfig = (): DatabaseConfig => ({
  host: process.env["POSTGRES_HOST"] || 'localhost',
  port: parseInt(process.env["POSTGRES_PORT"] || '5432'),
  username: process.env["POSTGRES_USER"] || 'blog_user',
  password: process.env["POSTGRES_PASSWORD"] || 'blog_password_2024',
  database: process.env["POSTGRES_DB"] || 'blog_db',
});

export const getMongoConfig = () => ({
  uri: `mongodb://${process.env["MONGO_USERNAME"]}:${process.env["MONGO_PASSWORD"]}@${process.env["MONGO_HOST"] || 'localhost'}:${process.env["MONGO_PORT"] || 27017}/${process.env["MONGO_DATABASE"]}`,
});

export const getRedisConfig = () => ({
  host: process.env["REDIS_HOST"] || 'localhost',
  port: parseInt(process.env["REDIS_PORT"] || '6379'),
  password: process.env["REDIS_PASSWORD"],
});