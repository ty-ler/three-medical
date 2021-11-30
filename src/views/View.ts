import {
  Color,
  Camera,
  Scene,
  WebGL1Renderer,
  HemisphereLight,
  DirectionalLight,
} from 'three';

export abstract class View {
  public abstract camera: Camera;

  public scene: Scene = new Scene();
  public container: HTMLElement;
  public renderer = new WebGL1Renderer();

  public hemiLight: HemisphereLight = new HemisphereLight(
    0xffffff,
    0x000000,
    1
  );
  public dirLight: DirectionalLight = new DirectionalLight(0xffffff, 0.5);

  constructor() {
    this.dirLight.position.set(200, 200, 200);

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x333333, 1);

    this.scene.add(this.hemiLight);
    this.scene.add(this.dirLight);
  }

  public setContainer(container: HTMLElement) {
    this.container = container;

    if (this.container) {
      this.renderer.setSize(
        this.container.offsetWidth,
        this.container.offsetHeight
      );

      const rendererElem = this.renderer.domElement;

      if (rendererElem.parentElement) {
        // Remove the renderer element if it's already in the DOM.
        const parent = this.renderer.domElement;
        parent.removeChild(rendererElem);
      }

      this.container.appendChild(rendererElem);

      this.container.removeEventListener('wheel', this.handleScroll, true);
      this.container.removeEventListener('scroll', this.handleScroll, true);
      this.container.addEventListener('wheel', this.handleScroll, true);
      this.container.addEventListener('scroll', this.handleScroll, true);
    }
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public abstract resize(): void;

  private handleScroll(e: Event) {
    e.preventDefault();
  }
}
