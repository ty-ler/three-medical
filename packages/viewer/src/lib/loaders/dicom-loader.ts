import { Loader, Matrix4, Vector3 } from 'three';
import { Volume } from '../common/volume';
import { readImageDICOMArrayBufferSeries } from 'itk-wasm';
import { parseDicom } from 'dicom-parser';

export class DicomLoader {
  public async loadSeries(urls: string[]) {
    const buffers = await Promise.all(
      urls.map((url, i) => this.loadImage(url, i === 0))
    );
    const series = await readImageDICOMArrayBufferSeries(buffers);

    const { image } = series;

    console.log('ITK-WASM image:', image);

    const volume = new Volume(
      image.size[0],
      image.size[1],
      image.size[2],
      'int32',
      image.data
    ) as any;

    const minMax = volume.computeMinMax();
    console.log(minMax);

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

  private async loadImage(url: string, getMetadata: boolean) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    if (getMetadata) {
      const parsed = parseDicom(new Uint8Array(buffer));
      console.log(parsed);
    }

    return buffer;
  }
}
