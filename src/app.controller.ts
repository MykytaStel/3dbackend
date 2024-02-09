import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AppService } from './app.service';
import { CuraWASMService } from './providers';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly curaWASMService: CuraWASMService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file): void {
    this.curaWASMService.slice(file, 'stl', {});
  }
}
