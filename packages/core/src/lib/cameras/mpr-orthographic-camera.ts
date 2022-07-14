import { Box3, Mesh, Object3D, OrthographicCamera, Vector3 } from 'three';
import { Orientation } from '../common/orientation';

export class MPROrthographicCamera extends OrthographicCamera {
  private target?: Object3D;

  constructor(private orientation: Orientation) {
    super();

    this.orientCamera();
  }

  public setTarget(target: Object3D) {
    this.target = target;
    this.lookAtTarget();
  }

  public lookAtTarget() {
    if (!this.target) return;

    this.lookAt(this.target.position);
    this.orientCamera();
  }

  public zoomBy(amount: number) {
    this.zoom = Math.min(Math.max(this.zoom + amount, 0.25), 6);
    this.updateProjectionMatrix();
    this.updateMatrix();
  }

  public fitToMesh(
    mesh: Mesh,
    width: number,
    height: number,
    margin: number = 0
  ) {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;

    if (box) {
      this.zoom = Math.min(
        (width - margin) / (box.max.x - box.min.x),
        (height - margin) / (box.max.y - box.min.y)
      );
      this.updateProjectionMatrix();
      this.updateMatrix();
    }
  }

  public updateValuesForContainerElement(containerElement: HTMLDivElement) {
    const { clientWidth, clientHeight } = containerElement;
    const aspectRatio = clientWidth / clientHeight;
    const viewSize = clientWidth;
    this.left = (-aspectRatio * viewSize) / 2;
    this.right = (aspectRatio * viewSize) / 2;
    this.top = (aspectRatio * viewSize) / 2;
    this.bottom = -(aspectRatio * viewSize) / 2;
    this.near = -5000;
    this.far = 5000;

    this.updateProjectionMatrix();
  }

  private orientCamera() {
    switch (this.orientation) {
      case Orientation.AXIAL:
        this.rotateX(Math.PI);
        break;
      case Orientation.SAGITTAL:
        this.rotateY(Math.PI * 0.5);
        this.rotateZ(Math.PI * 0.5);
        break;
      case Orientation.CORONAL:
        this.rotateX(Math.PI * 0.5);
        break;
    }
  }
}
