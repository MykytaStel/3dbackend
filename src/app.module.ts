import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bull';
import { CuraWASMProcessor } from './processors/cura.processor';
import { CuraWASMService, CuraWorkerService } from './providers';
import { EventController } from './controllers/event.controller';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'cura-wasm-queue',
    }),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [AppController, EventController],
  providers: [
    AppService,
    CuraWASMProcessor,
    CuraWASMService,
    CuraWorkerService,
  ],
})
export class AppModule {}
