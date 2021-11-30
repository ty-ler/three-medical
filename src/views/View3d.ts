import * as THREE from 'three';
import { View } from './View';
import { TrackballControls } from '../controls/TrackballControls';
import { Volume } from '../volume/Volume';
import { VolumeSlice } from '../volume/VolumeSlice';

export class View3d extends View {
  public camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
    60,
    0,
    0.01,
    1e10
  );
  public negateCamera: boolean = true;

  public volume: Volume;
  public slices: VolumeSlice[] = [];
  public controls: TrackballControls;

  constructor(volume: Volume, container?: HTMLElement) {
    super();

    this.scene.add(this.camera);

    this.volume = volume;
    this.camera.position.z = -300;
    this.camera.position.x += 75;
    this.camera.position.y += 75;

    this.initVolumeSlices();

    if (container) {
      this.setContainer(container);
    }
  }

  resize() {
    if (!this.container) {
      return;
    }

    this.camera.aspect =
      this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    );

    this.controls.handleResize();
  }

  setContainer(container: HTMLElement) {
    super.setContainer(container);

    if (this.container) {
      this.controls = new TrackballControls(this.camera, this.container);
      this.controls.minDistance = 100;
      this.controls.maxDistance = 1000;
      this.controls.rotateSpeed = 5.0;
      this.controls.zoomSpeed = 5;
      this.controls.panSpeed = 2;

      this.camera.aspect =
        this.container.offsetWidth / this.container.offsetHeight;

      this.camera.updateProjectionMatrix();

      this.fitCameraToSlices();
    }
  }

  render() {
    super.render();

    if (this.controls) {
      this.controls.update();
    }
  }

  public fitCameraToSlices(fitOffset = 1.25) {
    const box = new THREE.Box3();

    for (const slice of this.slices) box.expandByObject(slice.mesh);

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance =
      maxSize / (2 * Math.atan((Math.PI * this.camera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

    const direction = this.controls.target
      .clone()
      .sub(this.camera.position)
      .normalize()
      .multiplyScalar(distance);

    this.controls.maxDistance = distance * 10;
    this.controls.target.copy(center);

    this.camera.near = distance / 100;
    this.camera.far = distance * 100;
    this.camera.updateProjectionMatrix();

    this.camera.position.copy(this.controls.target).sub(direction);

    this.controls.update();
  }

  private initVolumeSlices() {
    if (!this.volume) {
      return;
    }

    this.slices = [];

    const sliceZ = this.volume.extractSlice(
      'z',
      Math.floor(this.volume.RASDimensions[2] / 4)
    );
    const sliceY = this.volume.extractSlice(
      'y',
      Math.floor(this.volume.RASDimensions[1] / 2)
    );
    const sliceX = this.volume.extractSlice(
      'x',
      Math.floor(this.volume.RASDimensions[0] / 2)
    );

    this.scene.add(sliceZ.mesh);
    this.scene.add(sliceY.mesh);
    this.scene.add(sliceX.mesh);

    this.slices = [sliceZ, sliceY, sliceX];
  }
}
