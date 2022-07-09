import { Matrix4, Vector3 } from 'three';
import { Volume } from './common/volume';
import { Image as ITKImage, readImageDICOMArrayBufferSeries } from 'itk-wasm';

export class DicomLoader {
  /**
   * Load a DICOM image series.
   *
   * @param urls list of DICOM blob urls
   * @returns three.js Volume
   */
  public async loadImageSeries(urls: string[]) {
    const buffers = await Promise.all(
      urls.map((url) => this.loadImageBuffer(url))
    );
    const image = await this.prepareImage(buffers);
    const volume = this.prepareVolume(image);

    return volume;
  }

  /**
   * Load a single DICOM image.
   *
   * @param url DICOM blob url
   * @returns three.js Volume
   */
  public async loadImage(url: string) {
    const buffer = await this.loadImageBuffer(url);
    const image = await this.prepareImage([buffer]);
    const volume = this.prepareVolume(image);

    return volume;
  }

  private async loadImageBuffer(url: string) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    return buffer;
  }

  private async prepareImage(buffers: ArrayBuffer[]) {
    const series = await readImageDICOMArrayBufferSeries(buffers);
    const { image } = series;
    return image;
  }

  private prepareVolume(image: ITKImage) {
    const volume = new Volume(
      image.size[0],
      image.size[1],
      image.size[2],
      'int32',
      image.data
    ) as any;

    const minMax = volume.computeMinMax();

    volume.windowLow = minMax[0];
    volume.windowHigh = minMax[1];

    volume.matrix = new Matrix4();
    volume.matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    volume.inverseMatrix = new Matrix4();
    volume.inverseMatrix.copy(volume.matrix).invert();

    const transitionMatrix = new Matrix4();

    // LPS
    transitionMatrix.set(-1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);

    volume.RASDimensions = new Vector3(
      volume.xLength,
      volume.yLength,
      volume.zLength
    )
      .applyMatrix4(volume.matrix)
      .round()
      .toArray()
      .map(Math.abs);

    return volume as Volume;
  }
}
