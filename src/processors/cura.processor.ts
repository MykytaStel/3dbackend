import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { CuraWorkerService } from 'src/providers';

@Processor('cura-wasm-queue')
export class CuraWASMProcessor {
  constructor(private curaWorkerService: CuraWorkerService) {}
  @Process('slice')
  async handleSlice(job: Job) {
    const { file, extension, config } = job.data;
    console.log('handleSlice', file);

    const bytes = file;
    console.log(bytes);
    // Тут ви викликаєте свій механізм обробки файлів
    try {
      // Припустимо, що у вас є сервіс, який обробляє файл та повертає gcode
      const gcode = await this.curaWorkerService.run(
        config.command,
        config.overrides,
        config.verbose,
        bytes,
        extension,
      );

      // Логіка повідомлення про прогрес та метадані
      // Врахуйте, що вам може знадобитися інший механізм для спостереження за прогресом
      // наприклад, використання EventEmitter або іншого сервісу Nest.js

      // Повернення результату
      return {
        gcode,
        metadata: 'тут ваші метадані', // Замініть це на фактичні метадані
      };
    } catch (error) {
      // Обробка помилок
      throw new Error(`Помилка під час обрізання: ${error.message}`);
    }
  }
}
