import { Camera, Scene, WebGLRenderer } from 'three';

export interface RenderLoopConfig {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: Camera;
  renderCallback?: (
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera
  ) => void;
}

export class RenderLoop {
  private renderLoopId: number = -1;

  constructor(private config: RenderLoopConfig) {}

  public start() {
    if (this.isActive()) {
      this.stop();
    }

    this.renderLoop();
  }

  public stop() {
    if (!this.isActive()) return;

    cancelAnimationFrame(this.renderLoopId);

    this.renderLoopId = -1;
  }

  public isActive() {
    return this.renderLoopId !== -1;
  }

  public setRenderCallback(
    callback: (renderer: WebGLRenderer, scene: Scene, camera: Camera) => void
  ) {
    this.config.renderCallback = callback;
  }

  private renderLoop() {
    this.renderLoopId = requestAnimationFrame(this.renderLoop.bind(this));

    if (this.isActive()) {
      this.render();
    }
  }

  private render() {
    const { renderer, scene, camera, renderCallback } = this.config;

    if (renderCallback) {
      renderCallback(renderer, scene, camera);
    }

    renderer.render(scene, camera);
  }
}
