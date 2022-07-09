import type { Types } from '@cornerstonejs/core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import * as dicomParser from 'dicom-parser';
import * as cornerstone from '@cornerstonejs/core/dist/umd/index';

export class DicomLoader {
  private get loader() {
    return cornerstoneWADOImageLoader.wadouri;
  }
  private initialized: boolean = false;

  public initialize() {
    if (this.isLoaderInitialized()) {
      console.warn('DicomLoader has already been initialized.');
      return;
    }

    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    cornerstoneWADOImageLoader.configure({
      useWebWorkers: true,
      decodeConfig: {
        convertFloatPixelDataToInt: false,
      },
    });

    var config = {
      maxWebWorkers: navigator.hardwareConcurrency || 1,
      startWebWorkersOnDemand: false,
      taskConfiguration: {
        decodeTask: {
          initializeCodecsOnStartup: true,
          strict: false,
        },
      },
    };

    cornerstoneWADOImageLoader.webWorkerManager.initialize(config);

    this.initialized = true;
  }

  public async loadImage(imageUrl: string) {
    return this.loader.loadImage(imageUrl);
  }

  public isLoaderInitialized() {
    return this.initialized;
  }
}

export const loadImage = async (imageUrl: string) => {};
