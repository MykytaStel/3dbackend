import { Controller } from '@nestjs/common';
import { CuraWorkerService } from 'src/providers';

@Controller()
export class EventController {
  constructor(private curaWorkerService: CuraWorkerService) {
    this.curaWorkerService.progressEmitter.on('progress', (progress) => {
      console.log(`Прогрес: ${progress}%`);
    });
  }
}
