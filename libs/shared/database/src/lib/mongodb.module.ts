import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
@Module({
    imports: [
        MongooseModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                uri: `mongodb://${configService.get('MONGO_USERNAME')}:${configService.get('MONGO_PASSWORD')}@${configService.get('MONGO_HOST', 'localhost')}:${configService.get('MONGO_PORT', 27017)}/${configService.get('MONGO_DATABASE')}`,
            }),
            inject: [ConfigService],
        }),
    ],
})
export class MongodbModule { }
