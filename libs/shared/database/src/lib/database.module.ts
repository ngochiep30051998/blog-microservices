import { Module } from '@nestjs/common';
import { PostgresModule } from './postgres.module';
import { MongodbModule } from './mongodb.module';

@Module({
  controllers: [],
  providers: [],
  exports: [],
  imports: [PostgresModule, MongodbModule],
})
export class DatabaseModule {}
