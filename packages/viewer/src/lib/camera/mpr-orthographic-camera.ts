import { Object3D, OrthographicCamera, Vector3 } from 'three';
import { OrientationDefinition } from '../common/orientation';

export class MPROrthographicCamera extends OrthographicCamera {
  private target?: Object3D;

  constructor(private orientation: OrientationDefinition) {
    super();

    // this.up.copy(this.orientation.up);
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
    const { name } = this.orientation;
    switch (name) {
      case 'axial':
        this.rotateX(Math.PI);
        break;
      case 'sagittal':
        this.rotateY(Math.PI * 0.5);
        this.rotateZ(Math.PI * 0.5);
        break;
      case 'coronal':
        this.rotateX(Math.PI * 0.5);
        break;
    }
  }
}
