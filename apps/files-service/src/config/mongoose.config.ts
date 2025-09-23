import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongooseConfigFactory = (
  configService: ConfigService,
): MongooseModuleOptions => {
  const mongoUri = configService.get<string>('MONGODB_URI')
  return {
    uri: mongoUri,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
    dbName: configService.get<string>('MONGO_DATABASE_FILES', 'blog_uploads'),
  };
};