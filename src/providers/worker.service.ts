import { Injectable } from '@nestjs/common';
import { CombinedDefinition } from 'cura-wasm-definitions/src/types';
import definitions from '../entity/definitions/index';
import { override } from '../entity/types';
import { generate } from '../entity/arguments';
import { convert } from '../entity/file';
import EventEmitter from 'events';
import CuraEngine from '../entity/CuraEngine';

@Injectable()
export class CuraWorkerService {
  private engine: any;
  private extruderCount: number | null = null;
  public progressEmitter = new EventEmitter();

  async initialize(verbose = false): Promise<void> {
    const config: Partial<any> = {
      noInitialRun: true,
      print: undefined,
      printErr: undefined,
    };

    if (!verbose) {
      config.print = () => null;
      config.printErr = () => null;
    }

    this.engine = await CuraEngine(config);
  }

  async addDefinitions(definition: CombinedDefinition): Promise<void> {
    if (this.engine == null) {
      throw new Error('Attempting to add definitions before initialization!');
    }

    this.engine.FS.mkdir('/definitions');

    this.engine.FS.mkdir('/definitions');

    //Add primary definitions
    for (const rawDefinition in definitions) {
      //Cast raw definition type
      const definition = <keyof typeof definitions>rawDefinition;

      const path = `/definitions/${definition}.def.json`;

      //Copy file to memory filesystem
      this.engine.FS.writeFile(path, JSON.stringify(definitions[definition]));
    }

    //Add secondary definition
    this.engine.FS.writeFile(
      '/definitions/printer.def.json',
      JSON.stringify(definition.printer),
    );

    for (const [i, extruder] of definition.extruders.entries()) {
      this.engine.FS.writeFile(
        `/definitions/extruder-${i}.def.json`,
        JSON.stringify(extruder),
      );
    }

    //Store extruder count for removal, later
    this.extruderCount = definition.extruders.length;
  }

  async removeDefinitions(): Promise<void> {
    if (this.engine == null || this.extruderCount == null) {
      throw new Error(
        'Attempting to remove definitions before initialization!',
      );
    }
    //Remove primary definitions
    for (const rawDefinition in definitions) {
      //Cast raw definition type
      const definition = <keyof typeof definitions>rawDefinition;

      const path = `/definitions/${definition}.def.json`;

      //Copy file to memory filesystem
      this.engine.FS.unlink(path);
    }

    //Remove secondary definition
    this.engine.FS.unlink('/definitions/printer.def.json');

    for (let i = 0; i < this.extruderCount; i++) {
      this.engine.FS.unlink(`/definitions/extruder-${i}.def.json`);
    }

    this.engine.FS.rmdir('/definitions');
  }

  async run(
    command: string | null,
    overrides: override[] | null,
    verbose: boolean | null,
    file: ArrayBuffer,
    extension: string,
  ): Promise<Error | ArrayBuffer> {
    console.log('run');
    if (this.engine == null) {
      throw new Error('Attempting to run Cura Engine before initialization!');
    }
    /**
     * The bias of the file converter progress (Range: 0-1)
     *
     * A higher value indicates more time is usually taken
     * by the file converter and less time by the slicer
     */
    const converterBias = extension == 'stl' ? 0 : 0.3;
    // const slicerBias = 1 - converterBias;

    // Конвертація файлу в STL
    const stl = await convert(file, extension, (converterProgress) => {
      // Відправлення інформації про прогрес конвертації
      const progressValue = converterProgress * converterBias;
      this.progressEmitter.emit('progress', progressValue);
    });

    //Handle errors
    if (stl instanceof Error) {
      return stl;
    } else {
      //Write the file
      this.engine.FS.writeFile('Model.stl', stl);

      let previousSlicerProgress = 0;

      // Створення функції для відстеження прогресу
      const updateProgress = (slicerProgress: number) => {
        slicerProgress = Math.round(100 * slicerProgress) / 100;
        if (slicerProgress != previousSlicerProgress) {
          this.progressEmitter.emit('progress', slicerProgress);
          previousSlicerProgress = slicerProgress;
        }
      };

      globalThis['cura-wasm-progress-callback'] = updateProgress;
      // Запуск Cura Engine
      const args =
        command == null ? generate(overrides, verbose) : command.split(' ');
      if (verbose) {
        console.log(`Calling Cura Engine with ${args.join(' ')}`);
      }
      this.engine.callMain(args);

      globalThis['cura-wasm-progress-callback'] = undefined;

      // Читання та повернення файлу GCode
      const gcode = this.engine.FS.readFile('Model.gcode').buffer;
      this.engine.FS.unlink('Model.stl');
      this.engine.FS.unlink('Model.gcode');

      return gcode;
    }
  }
}
