import {
  ClampToEdgeWrapping,
  DoubleSide,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Texture,
} from 'three';
import { Orientation } from './orientation';
import { Volume } from './volume';

export type VolumeSliceAxis = 'x' | 'y' | 'z';

export class VolumeSlice {
  public geometry: PlaneGeometry;
  public mesh: Mesh;
  public material: MeshBasicMaterial;
  public canvas: HTMLCanvasElement;
  public canvasBuffer: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D | null;
  public ctxBuffer: CanvasRenderingContext2D | null;

  private index: number = -1;
  private geometryNeedsUpdate: boolean = false;
  private matrix: Matrix4 = new Matrix4();
  private sliceAccess: any;
  private iLength: number = -1;
  private jLength: number = -1;

  constructor(
    public volume: Volume,
    private orientation: Orientation,
    index: number
  ) {
    this.canvas = document.createElement('canvas');
    this.canvasBuffer = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctxBuffer = this.canvasBuffer.getContext('2d');

    this.updateGeometry();

    const canvasMap = new Texture(this.canvas);
    canvasMap.minFilter = LinearFilter;
    canvasMap.wrapS = ClampToEdgeWrapping;
    canvasMap.wrapT = ClampToEdgeWrapping;

    this.geometry = new PlaneGeometry();
    this.material = new MeshBasicMaterial({
      map: canvasMap,
      side: DoubleSide,
      transparent: true,
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.matrixAutoUpdate = false;

    this.setIndex(index);

    this.setGeometryNeedsUpdate(true);
    this.repaint();
  }

  public incrementIndex(amount: number = 1) {
    const index = this.getIndex();
    const minIndex = this.getMinIndex();
    const maxIndex = this.getMaxIndex();
    const newIndex = Math.max(Math.min(index + amount, maxIndex), minIndex);

    this.setIndex(newIndex);
  }

  public setIndex(index: number) {
    if (this.index === index) return;

    this.index = index;
    this.setGeometryNeedsUpdate(true);
  }

  public getIndex() {
    return this.index;
  }

  public getMinIndex() {
    return 0;
  }

  public getMaxIndex() {
    const size = this.volume.getSize();

    switch (this.orientation) {
      case Orientation.AXIAL:
        return size[2] - 1;
      case Orientation.SAGITTAL:
        return size[0] - 1;
      case Orientation.CORONAL:
        return size[1] - 1;
    }
  }

  public getOrientation() {
    return this.orientation;
  }

  public repaint() {
    if (this.geometryNeedsUpdate) {
      this.updateGeometry();
    }

    const iLength = this.iLength,
      jLength = this.jLength,
      sliceAccess = this.sliceAccess,
      volume = this.volume,
      canvas = this.canvasBuffer,
      ctx = this.ctxBuffer;

    if (!ctx) return;

    // get the imageData and pixel array from the canvas
    const imgData = ctx.getImageData(0, 0, iLength, jLength);
    const data = imgData.data;
    const volumeData = volume.getData();
    const upperThreshold = volume.getUpperThreshold();
    const lowerThreshold = volume.getLowerThreshold();
    const windowLow = volume.getMin();
    const windowHigh = volume.getMax();

    // manipulate some pixel elements
    let pixelCount = 0;

    if (
      !this.ctx ||
      !ctx ||
      !sliceAccess ||
      !data ||
      upperThreshold == null ||
      lowerThreshold == null ||
      windowLow == null ||
      windowHigh == null
    )
      return;

    // if (volume.dataType === 'label') {
    //   //this part is currently useless but will be used when colortables will be handled
    //   for (let j = 0; j < jLength; j++) {
    //     for (let i = 0; i < iLength; i++) {
    //       let label = volumeData[sliceAccess(i, j)];
    //       label =
    //         label >= this.colorMap.length
    //           ? (label % this.colorMap.length) + 1
    //           : label;
    //       const color = this.colorMap[label];
    //       data[4 * pixelCount] = (color >> 24) & 0xff;
    //       data[4 * pixelCount + 1] = (color >> 16) & 0xff;
    //       data[4 * pixelCount + 2] = (color >> 8) & 0xff;
    //       data[4 * pixelCount + 3] = color & 0xff;
    //       pixelCount++;
    //     }
    //   }
    // } else {
    for (let j = 0; j < jLength; j++) {
      for (let i = 0; i < iLength; i++) {
        let value = volumeData[sliceAccess(i, j)];
        let alpha = 0xff;
        //apply threshold
        alpha =
          upperThreshold >= value ? (lowerThreshold <= value ? alpha : 0) : 0;
        //apply window level
        value = Math.floor(
          (255 * (value - windowLow)) / (windowHigh - windowLow)
        );
        value = value > 255 ? 255 : value < 0 ? 0 : value | 0;

        data[4 * pixelCount] = value;
        data[4 * pixelCount + 1] = value;
        data[4 * pixelCount + 2] = value;
        data[4 * pixelCount + 3] = alpha;
        pixelCount++;
      }
    }
    // }

    ctx.putImageData(imgData, 0, 0);
    this.ctx.drawImage(
      canvas,
      0,
      0,
      iLength,
      jLength,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    (this.mesh.material as any).map.needsUpdate = true;
  }

  public setGeometryNeedsUpdate(geometryNeedsUpdate: boolean) {
    this.geometryNeedsUpdate = geometryNeedsUpdate;
  }

  public updateGeometry() {
    const extracted = this.volume.extractPerpendicularPlane(
      this.orientation,
      this.index
    );
    this.sliceAccess = extracted.sliceAccess;
    this.jLength = extracted.jLength;
    this.iLength = extracted.iLength;

    this.matrix = extracted.matrix;
    this.canvas.width = extracted.planeWidth;
    this.canvas.height = extracted.planeHeight;
    this.canvasBuffer.width = this.iLength;
    this.canvasBuffer.height = this.jLength;
    this.ctx = this.canvas.getContext('2d');
    this.ctxBuffer = this.canvasBuffer.getContext('2d');

    if (this.geometry) this.geometry.dispose(); // dispose existing geometry

    this.geometry = new PlaneGeometry(
      extracted.planeWidth,
      extracted.planeHeight
    );

    if (this.mesh) {
      this.mesh.geometry = this.geometry;
      //reset mesh matrix
      this.mesh.matrix.identity();
      this.mesh.applyMatrix4(this.matrix);
    }

    this.setGeometryNeedsUpdate(false);
  }
}
