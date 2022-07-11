import { Object3D, OrthographicCamera } from 'three';
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

  public updateValuesForContainerElement(containerElement: HTMLDivElement) {
    const { clientWidth, clientHeight } = containerElement;
    const aspectRatio = clientWidth / clientHeight;
    const viewSize = clientWidth;
    this.left = (-aspectRatio * viewSize) / 2;
    this.right = (aspectRatio * viewSize) / 2;
    this.top = (aspectRatio * viewSize) / 2;
    this.bottom = -(aspectRatio * viewSize) / 2;
    this.near = -1000;
    this.far = 1000;

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
