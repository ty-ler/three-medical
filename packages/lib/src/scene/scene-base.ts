import { Scene } from 'three';

export abstract class SceneBase {
  public scene: Scene = new Scene();
  public containerElement: HTMLElement;

  constructor(containerElement: HTMLElement) {
    this.containerElement = containerElement;
  }

  public abstract init(): void;
}
