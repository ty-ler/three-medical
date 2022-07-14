import { Image } from 'itk-wasm';
import { Matrix4, Vector3 } from 'three';
import { getOrientationIndex, Orientation } from './orientation';
import { VolumeSlice, VolumeSliceAxis } from './volume-slice';

export class Volume {
  public sliceList: VolumeSlice[] = [];

  private data: Int32Array = new Int32Array();
  private size: number[] = [0, 0, 0];
  private spacing: number[] = [0, 0, 0];

  private axisOrder: string[] = ['x', 'y', 'z'];
  private matrix: Matrix4 = new Matrix4();
  private inverseMatrix: Matrix4 = new Matrix4();
  private lowerThreshold: number = -Infinity;
  private upperThreshold: number = Infinity;
  private min: number = 0;
  private max: number = 0;

  constructor(volumeImage: Image) {
    const { data, size, spacing } = volumeImage;
    this.data = data;
    this.size = size;
    this.spacing = spacing;

    this.computeMinMax();

    // this should probably just be matrix.identity()
    // this.matrix.set(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    this.matrix.identity();

    this.inverseMatrix.copy(this.matrix).invert();
  }

  public repaintAllSlices() {
    this.sliceList.forEach((slice) => slice.repaint());
  }

  public extractSlice(orientation: Orientation, index: number) {
    const slice = new VolumeSlice(this, orientation, index);
    this.sliceList.push(slice);

    return slice;
  }

  public extractPerpendicularPlane(orientation: Orientation, RASIndex: number) {
    let firstSpacing, secondSpacing, positionOffset, IJKIndex: Vector3;

    const axisInIJK = new Vector3(),
      firstDirection = new Vector3(),
      secondDirection = new Vector3(),
      planeMatrix = new Matrix4().identity();

    const [sizeX, sizeY, sizeZ] = this.size;

    const dimensions = new Vector3(sizeX, sizeY, sizeZ);

    switch (orientation) {
      case Orientation.SAGITTAL:
        axisInIJK.set(1, 0, 0);
        firstDirection.set(0, 0, -1);
        secondDirection.set(0, -1, 0);
        firstSpacing = this.spacing[this.axisOrder.indexOf('z')];
        secondSpacing = this.spacing[this.axisOrder.indexOf('y')];
        IJKIndex = new Vector3(RASIndex, 0, 0);

        planeMatrix.multiply(new Matrix4().makeRotationY(Math.PI / 2));
        positionOffset = (this.size[0] - 1) / 2;
        planeMatrix.setPosition(new Vector3(RASIndex - positionOffset, 0, 0));
        break;
      case Orientation.CORONAL:
        axisInIJK.set(0, 1, 0);
        firstDirection.set(1, 0, 0);
        secondDirection.set(0, 0, 1);
        firstSpacing = this.spacing[this.axisOrder.indexOf('x')];
        secondSpacing = this.spacing[this.axisOrder.indexOf('z')];
        IJKIndex = new Vector3(0, RASIndex, 0);

        planeMatrix.multiply(new Matrix4().makeRotationX(-Math.PI / 2));
        positionOffset = (this.size[1] - 1) / 2;
        planeMatrix.setPosition(new Vector3(0, RASIndex - positionOffset, 0));
        break;
      case Orientation.AXIAL:
      default:
        axisInIJK.set(0, 0, 1);
        firstDirection.set(1, 0, 0);
        secondDirection.set(0, -1, 0);
        firstSpacing = this.spacing[this.axisOrder.indexOf('x')];
        secondSpacing = this.spacing[this.axisOrder.indexOf('y')];
        IJKIndex = new Vector3(0, 0, RASIndex);

        positionOffset = (this.size[2] - 1) / 2;
        planeMatrix.setPosition(new Vector3(0, 0, RASIndex - positionOffset));
        break;
    }

    firstDirection.applyMatrix4(this.inverseMatrix).normalize();
    (firstDirection as any).arglet = 'i';
    secondDirection.applyMatrix4(this.inverseMatrix).normalize();
    (secondDirection as any).arglet = 'j';
    axisInIJK.applyMatrix4(this.inverseMatrix).normalize();
    const iLength = Math.floor(Math.abs(firstDirection.dot(dimensions)));
    const jLength = Math.floor(Math.abs(secondDirection.dot(dimensions)));
    const planeWidth = Math.abs(iLength * firstSpacing);
    const planeHeight = Math.abs(jLength * secondSpacing);

    (IJKIndex as any) = Math.abs(
      Math.round(IJKIndex.applyMatrix4(this.inverseMatrix).dot(axisInIJK))
    );
    const base = [
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, 0, 1),
    ];
    const iDirection = [firstDirection, secondDirection, axisInIJK].find(
      function (x) {
        return Math.abs(x.dot(base[0])) > 0.9;
      }
    );
    const jDirection = [firstDirection, secondDirection, axisInIJK].find(
      function (x) {
        return Math.abs(x.dot(base[1])) > 0.9;
      }
    );
    const kDirection = [firstDirection, secondDirection, axisInIJK].find(
      function (x) {
        return Math.abs(x.dot(base[2])) > 0.9;
      }
    );

    const sliceAccess = (i: number, j: number) => {
      const si =
        iDirection === axisInIJK
          ? IJKIndex
          : (iDirection as any).arglet === 'i'
          ? i
          : j;
      const sj =
        jDirection === axisInIJK
          ? IJKIndex
          : (jDirection as any).arglet === 'i'
          ? i
          : j;
      const sk =
        kDirection === axisInIJK
          ? IJKIndex
          : (kDirection as any).arglet === 'i'
          ? i
          : j;

      // invert indices if necessary

      const accessI =
        (iDirection as any).dot(base[0]) > 0
          ? si
          : this.size[0] - 1 - (si as any);
      const accessJ =
        (jDirection as any).dot(base[1]) > 0
          ? sj
          : this.size[1] - 1 - (sj as any);
      const accessK =
        (kDirection as any).dot(base[2]) > 0
          ? sk
          : this.size[2] - 1 - (sk as any);

      return this.getDataIndex(
        accessI as number,
        accessJ as number,
        accessK as number
      );
    };

    return {
      iLength: iLength,
      jLength: jLength,
      sliceAccess: sliceAccess,
      matrix: planeMatrix,
      planeWidth: planeWidth,
      planeHeight: planeHeight,
    };
  }

  public computeMinMax() {
    let min = Infinity;
    let max = -Infinity;

    // buffer the length
    const datasize = this.data.length;

    let i = 0;

    for (i = 0; i < datasize; i++) {
      if (!isNaN(this.data[i])) {
        const value = this.data[i];
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }

    this.min = min;
    this.max = max;
    this.setLowerThreshold(min);
    this.setUpperThreshold(max);

    return [min, max];
  }

  public setLowerThreshold(lowerThreshold: number) {
    this.lowerThreshold = lowerThreshold;

    this.onChangeThreshold();
  }

  public getLowerThreshold() {
    return this.lowerThreshold;
  }

  public setUpperThreshold(upperThreshold: number) {
    this.upperThreshold = upperThreshold;

    this.onChangeThreshold();
  }

  public getUpperThreshold() {
    return this.upperThreshold;
  }

  public getMin() {
    return this.min;
  }

  public getMax() {
    return this.max;
  }

  public getData() {
    return this.data;
  }

  public getSize() {
    return [...this.size];
  }

  public getOrientationSize(orientation: Orientation) {
    const index = getOrientationIndex(orientation);
    return this.getSize()[index];
  }

  public getSpacing() {
    return [...this.spacing];
  }

  public getMatrix() {
    return new Matrix4().copy(this.matrix);
  }

  private onChangeThreshold() {
    this.sliceList.forEach((slice) => slice.setGeometryNeedsUpdate(true));
  }

  private getDataAtIndex(i: number, j: number, k: number) {
    const index = this.getDataIndex(i, j, k);

    return this.data[index];
  }

  private getDataIndex(i: number, j: number, k: number) {
    const sizeX = this.size[0];
    const sizeY = this.size[1];

    return k * sizeX * sizeY + j * sizeX + i;
  }

  private reverseAccess(index: number) {
    const sizeX = this.size[0];
    const sizeY = this.size[1];

    const z = Math.floor(index / (sizeY * sizeX));
    const y = Math.floor((index - z * sizeY * sizeX) / sizeX);
    const x = index - z * sizeY * sizeX - y * sizeX;

    return [x, y, z];
  }

  // private map(functionToMap: Function, context: any) {
  //   const { data } = this.volumeImage;
  //   const length = data.length;
  //   context = context || this;

  //   for (let i = 0; i < length; i++) {
  //     data[i] = functionToMap.call(context, data[i], i, data);
  //   }

  //   return this;
  // }
}
