import { WebGLRenderer } from 'three';

export const setRendererContainerElement = (
  renderer: WebGLRenderer,
  containerElement: HTMLDivElement
) => {
  const { domElement } = renderer;
  if (domElement.parentElement) {
    domElement.parentElement.removeChild(domElement);
  }

  containerElement.appendChild(domElement);

  const { clientWidth, clientHeight } = containerElement;
  renderer.setSize(clientWidth, clientHeight);
};
