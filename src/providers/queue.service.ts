import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class CuraWASMService {
  constructor(@InjectQueue('cura-wasm-queue') private curaWasmQueue: Queue) {}

  async initialize(config: any): Promise<void> {
    await this.curaWasmQueue.add('initialize', config);
  }

  async slice(
    file: ArrayBuffer,
    extension: string,
    config: any,
  ): Promise<void> {
    await this.curaWasmQueue.add('slice', { file, extension, config });
  }

  async destroy(): Promise<void> {
    await this.curaWasmQueue.add('destroy');
  }
}
