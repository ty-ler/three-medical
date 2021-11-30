import { Box3, Mesh, OrthographicCamera, ShaderMaterial, Vector3 } from 'three';
import { TrackballControls } from '../controls/TrackballControls';
import { Volume } from '../volume/Volume';
import { VolumeSlice } from '../volume/VolumeSlice';
import { View } from './View';

export class View2d extends View {
  public camera: OrthographicCamera = new OrthographicCamera(
    0,
    0,
    0,
    0,
    -1e10,
    1e10
  );

  public volume: Volume;
  public slice: VolumeSlice;

  public borderMesh: Mesh;

  public controls: TrackballControls;
  public up: Vector3;

  public get axis() {
    return this.slice?.axis || null;
  }

  private negateCamera: boolean = false;

  constructor(volume: Volume, axis: string, container?: HTMLElement) {
    super();

    this.scene.add(this.camera);

    this.initVolumeSlice(volume, axis);

    if (container) {
      this.setContainer(container);
    }

    // const geometry = new BoxGeometry(
    //   volume.xLength,
    //   volume.yLength,
    //   volume.zLength
    // );
    // const material = new MeshBasicMaterial({ color: 0x00ff00 });
    // const cube = new Mesh(geometry, material);
    // cube.visible = false;
    // const box = new BoxHelper(cube);
    // this.scene.add(box);
    // box.applyMatrix4(new Matrix4().setFromMatrix3(this.slice.volume.matrix));
    // this.scene.add(cube);
  }

  setContainer(container: HTMLElement) {
    super.setContainer(container);

    if (this.container) {
      this.controls = new TrackballControls(this.camera, this.container);
      this.controls.noRotate = true;
      this.controls.zoomSpeed = 5;
      this.controls.panSpeed = 5;
      this.controls.staticMoving = true;
      this.controls.update();
    }

    this.fitCameraToSlice();
    this.updateCamera();
  }

  render() {
    super.render();

    if (this.controls) {
      this.controls.update();
    }
  }

  resize() {
    if (!this.container) {
      return;
    }

    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    );

    this.updateCamera();
  }

  public fitCameraToSlice() {
    if (!this.slice) {
      return;
    }

    const geometry = this.slice.mesh.geometry;
    geometry.computeBoundingBox();
    const boundingBox: Box3 = geometry.boundingBox;

    if (this.axis === 'x') {
      const minX = boundingBox.min.x;
      const maxX = boundingBox.max.x;

      boundingBox.min.x = boundingBox.min.y;
      boundingBox.max.x = boundingBox.max.y;
      boundingBox.min.y = minX;
      boundingBox.max.y = maxX;
    }

    this.camera.zoom =
      Math.min(
        this.container.offsetWidth / (boundingBox.max.x - boundingBox.min.x),
        this.container.offsetHeight / (boundingBox.max.y - boundingBox.min.y)
      ) * 0.95;

    // this.camera.position.copy(boundingBox.getCenter(new Vector3()));
    this.lookAtSlice();
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrix();
  }

  private initVolumeSlice(volume: Volume, axis: string) {
    if (axis) {
      axis = axis.toLowerCase();
    }

    if (!axis) {
      return;
    }

    this.volume = volume;

    let index: number = null;
    let up: Vector3 = null;
    switch (axis) {
      case 'z':
        index = Math.floor(this.volume.RASDimensions[2] / 4);
        up = new Vector3(0, 1, 0);
        this.negateCamera = true;
        break;
      case 'y':
        index = Math.floor(this.volume.RASDimensions[1] / 2);
        up = new Vector3(0, 0, 1);
        this.negateCamera = true;
        break;
      case 'x':
        index = Math.floor(this.volume.RASDimensions[0] / 2);
        up = new Vector3(0, 0, 1);
        break;
    }

    this.up = up;

    if (index == null) {
      return;
    }

    this.camera.up.set(this.up.x, this.up.y, this.up.z);

    this.slice = volume.extractSlice(axis, index);
    this.scene.add(this.slice.mesh);

    this.initBorderShader();

    this.lookAtSlice();
  }

  public updateCamera() {
    const viewport = this.getViewport();

    if (viewport) {
      this.camera.left = viewport.left;
      this.camera.right = viewport.right;
      this.camera.top = viewport.top;
      this.camera.bottom = viewport.bottom;
      this.camera.near = viewport.near;
      this.camera.far = viewport.far;
    }

    // if (this.container) {
    //   this.camera.left = this.container.offsetWidth / -2;
    //   this.camera.right = this.container.offsetWidth / 2;
    //   this.camera.top = this.container.offsetHeight / 2;
    //   this.camera.bottom = this.container.offsetHeight / -2;
    //   this.camera.near = viewport.near;
    //   this.camera.far = viewport.far;
    // }

    this.camera.updateProjectionMatrix();
  }

  public resetControls() {
    if (!this.controls) {
      return;
    }

    this.controls.reset();
    this.fitCameraToSlice();
  }

  private lookAtSlice() {
    if (!this.slice) {
      return;
    }

    const meshPos = this.slice.mesh.position.clone();
    const pos = this.negateCamera ? meshPos.negate() : meshPos;

    this.camera.lookAt(pos.x, pos.y, pos.z);

    if (this.controls) {
      this.controls.target.copy(pos);
      // this.controls.up0.set(this.up.x, this.up.y, this.up.z);
      this.controls.update();
    }
  }

  private initBorderShader() {
    const shader = {
      outline: {
        vertex_shader: [
          'uniform float offset;',
          'void main() {',
          'vec4 pos = modelViewMatrix * vec4( position + normal * offset, 1.0 );',
          'gl_Position = projectionMatrix * pos;',
          '}',
        ].join('\n'),
        fragment_shader: [
          'void main(){',
          'gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );',
          '}',
        ].join('\n'),
      },
    };

    const uniforms = {
      offset: {
        type: 'f',
        value: 10,
      },
    };

    const outShader = shader.outline;

    const shaderMaterial = new ShaderMaterial({
      uniforms,
      vertexShader: outShader.vertex_shader,
      fragmentShader: outShader.fragment_shader,
    });
    shaderMaterial.depthWrite = false;

    this.borderMesh = new Mesh(this.slice.mesh.geometry, shaderMaterial);
    this.borderMesh.applyQuaternion(this.slice.mesh.quaternion);

    this.scene.add(this.borderMesh);
    console.log('adding border mesh');

    // this.composer = new EffectComposer(this.renderer);
    // this.composer.renderTarget1.stencilBuffer = true;
    // this.composer.renderTarget2.stencilBuffer = true;

    // const normal = new RenderPass(this.scene, this.camera);
    // const outline = new RenderPass(this.scene, this.camera);

    // outline.clear = false;
  }

  private getViewport() {
    if (!this.container) {
      return null;
    }

    const w = this.container.offsetWidth;
    const h = this.container.offsetHeight;
    const viewSize = h;
    const aspectRatio = w / h;

    return {
      viewSize: viewSize,
      aspectRatio: aspectRatio,
      left: (-aspectRatio * viewSize) / 2,
      right: (aspectRatio * viewSize) / 2,
      top: viewSize / 2,
      bottom: -viewSize / 2,
      near: -1e10,
      far: 1e10,
    };
  }
}
