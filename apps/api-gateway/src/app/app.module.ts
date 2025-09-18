import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from '@blog/shared/kafka';
import { AppController } from './app.controller';
import { AppService } from './app.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    KafkaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
