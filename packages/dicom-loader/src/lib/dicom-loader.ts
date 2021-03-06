import { Matrix4, Vector3 } from 'three';
import { Volume } from '@three-medical/core';
import { Image as ITKImage, readImageDICOMArrayBufferSeries } from 'itk-wasm';

export class DicomLoader {
  /**
   * Load a DICOM image series.
   *
   * @param urls list of DICOM blob urls
   * @param processBufferCallback (optional) callback used to process the buffer
   * before converting to a volume.
   * @returns three.js Volume
   */
  public async loadImageSeries(
    urls: string[],
    processBufferCallback?: (
      buffer: ArrayBuffer
    ) => ArrayBuffer | Promise<ArrayBuffer>
  ) {
    const buffers = await Promise.all(
      urls.map((url) => this.loadImageBuffer(url, processBufferCallback))
    );
    const image = await this.prepareImage(buffers);
    const volume = this.prepareVolume(image);

    return volume;
  }

  /**
   * Load a single DICOM image.
   *
   * @param url DICOM blob url
   * @param processBufferCallback (optional) callback used to process the buffer
   * before converting to a volume.
   * @returns three.js Volume
   */
  public async loadImage(
    url: string,
    processBufferCallback?: (
      buffer: ArrayBuffer
    ) => ArrayBuffer | Promise<ArrayBuffer>
  ) {
    const buffer = await this.loadImageBuffer(url, processBufferCallback);
    const image = await this.prepareImage([buffer]);
    const volume = this.prepareVolume(image);

    return volume;
  }

  private async loadImageBuffer(
    url: string,
    processBufferCallback?: (
      buffer: ArrayBuffer
    ) => ArrayBuffer | Promise<ArrayBuffer>
  ) {
    const res = await fetch(url);
    let buffer = await res.arrayBuffer();

    if (processBufferCallback) {
      buffer = await processBufferCallback(buffer);
      if (!(buffer instanceof ArrayBuffer)) {
        throw new Error(
          'Must return ArrayBuffer instance from processBufferCallback'
        );
      }
    }

    return buffer;
  }

  private async prepareImage(buffers: ArrayBuffer[]) {
    const series = await readImageDICOMArrayBufferSeries(buffers);
    const { image } = series;
    return image;
  }

  private prepareVolume(image: ITKImage) {
    const volume = new Volume(image);

    // volume.spacing = [...image.spacing];

    // const minMax = volume.computeMinMax();

    // volume.windowLow = minMax[0];
    // volume.windowHigh = minMax[1];

    // volume.matrix = new Matrix4();
    // volume.matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    // volume.inverseMatrix = new Matrix4();
    // volume.inverseMatrix.copy(volume.matrix).invert();

    // volume.RASDimensions = new Vector3(
    //   volume.xLength,
    //   volume.yLength,
    //   volume.zLength
    // )
    //   .applyMatrix4(volume.matrix)
    //   .round()
    //   .toArray()
    //   .map(Math.abs);

    // if (volume.lowerThreshold === -Infinity) {
    //   volume.lowerThreshold = minMax[0];
    // }

    // if (volume.upperThreshold === Infinity) {
    //   volume.upperThreshold = minMax[1];
    // }

    return volume as Volume;
  }
}
