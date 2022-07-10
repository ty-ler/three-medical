import {
  Camera,
  Color,
  ColorRepresentation,
  Light,
  Mesh,
  Scene,
  WebGLRenderer,
} from 'three';

export class Viewport {
  private scene: Scene;
  private camera?: Camera;
  private renderer: WebGLRenderer;
  private containerElement?: HTMLDivElement;
  private renderLoopId: number = -1;
  private renderCallback?: () => void;
  private clearColor: ColorRepresentation = 0x333333;

  constructor() {
    this.scene = new Scene();

    this.renderer = new WebGLRenderer({
      antialias: true,
    });
    this.setupRenderer();
  }

  public setCamera(camera: Camera) {
    if (this.camera) {
      this.scene.remove(this.camera);
    }

    this.camera = camera;
    this.scene.add(this.camera);
  }

  public getCamera() {
    return this.camera;
  }

  public getScene() {
    return this.scene;
  }

  public addLight(light: Light) {
    this.scene.add(light);
  }

  public addMesh(mesh: Mesh) {
    this.scene.add(mesh);
  }

  public getRenderer() {
    return this.renderer;
  }

  public render() {
    if (!this.camera) return;

    if (this.renderCallback) {
      this.renderCallback();
    }

    this.renderer.render(this.scene, this.camera);
  }

  public setRenderCallback(callback: () => void) {
    return (this.renderCallback = callback);
  }

  public startRenderLoop() {
    if (this.isRenderLoopActive()) {
      this.cancelRenderLoop();
    }

    this.renderLoop();
  }

  public cancelRenderLoop() {
    if (!this.isRenderLoopActive()) return;

    cancelAnimationFrame(this.renderLoopId);

    this.renderLoopId = -1;
  }

  public isRenderLoopActive() {
    return this.renderLoopId !== -1;
  }

  public setContainerElement(containerElement: HTMLDivElement) {
    const { domElement } = this.renderer;
    if (this.containerElement) {
      this.containerElement.removeChild(domElement);
    }

    this.containerElement = containerElement;
    this.containerElement.appendChild(domElement);

    const { clientWidth, clientHeight } = this.containerElement;
    this.renderer.setSize(clientWidth, clientHeight);
  }

  public getContainerElement() {
    return this.containerElement;
  }

  public setClearColor(color: ColorRepresentation) {
    this.clearColor = color;
    this.renderer.setClearColor(this.clearColor);
  }

  public getClearColor() {
    return this.clearColor;
  }

  private renderLoop() {
    this.renderLoopId = requestAnimationFrame(this.renderLoop.bind(this));

    if (this.isRenderLoopActive()) {
      this.render();
    }
  }

  private setupRenderer() {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(this.clearColor);
  }
}
