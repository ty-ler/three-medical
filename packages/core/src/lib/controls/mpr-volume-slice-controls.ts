import { Camera, Side, WebGLRenderer } from 'three';
import { MPROrthographicCamera } from '../cameras';
import { VolumeSlice } from '../common';
import { normalizeWheel } from '../helpers';
import { ControlConfig, ControlMethod } from './control-config';

const throwConfigError = (controlName: string, config: ControlConfig) => {
  throw new Error(
    `${controlName} control cannot be used with config: ${JSON.stringify(
      config,
      null,
      4
    )}`
  );
};

export interface MPRVolumeSliceControlsDragEvent {
  event: MouseEvent;
  movedX: boolean;
  movedY: boolean;
  deltaX: number;
  deltaY: number;
}

export class MPRVolumeSliceControls {
  private wheelAbortController = new AbortController();
  private dragAbortControllers = new Map<ControlMethod, AbortController>();

  private dragging: boolean = false;
  private draggingTimeout: ReturnType<typeof setTimeout> = -1;
  private draggingButton: number = -1;

  private get domElement() {
    return this.renderer.domElement;
  }

  constructor(
    private camera: MPROrthographicCamera,
    private renderer: WebGLRenderer,
    private volumeSlice: VolumeSlice
  ) {
    this.slicingWheelHandler = this.slicingWheelHandler.bind(this);
    this.slicingDragHandler = this.slicingDragHandler.bind(this);
    this.zoomWheelHandler = this.zoomWheelHandler.bind(this);
    this.zoomDragHandler = this.zoomDragHandler.bind(this);
  }

  public withSlicing(config: ControlConfig) {
    const { methods } = config;

    methods.forEach((method) => {
      switch (method) {
        case ControlMethod.Primary:
        case ControlMethod.Secondary:
          this.addDragHandler(method, (e) => this.slicingDragHandler(e));
          break;
        case ControlMethod.Wheel:
          this.addWheelHandler((e) => this.slicingWheelHandler(e, config));
          break;
        default:
          throwConfigError('Slicing', config);
      }
    });

    return this;
  }

  public withZoom(config: ControlConfig) {
    const { methods } = config;

    methods.forEach((method) => {
      switch (method) {
        case ControlMethod.Primary:
        case ControlMethod.Secondary:
          this.addDragHandler(method, (e) => this.zoomDragHandler(e));
          break;
        case ControlMethod.Wheel:
          this.addWheelHandler((e) => this.zoomWheelHandler(e));
          break;
        default:
          throwConfigError('Zoom', config);
      }
    });

    return this;
  }

  public dispose() {
    this.cancelWheelHandler();
  }

  private slicingWheelHandler(e: WheelEvent, config: ControlConfig) {
    e.preventDefault();
    e.stopPropagation();

    const { spinY } = normalizeWheel(e);
    const amount = spinY;

    this.volumeSlice.incrementIndex(amount);
    this.volumeSlice.repaint();
  }

  private slicingDragHandler(e: MPRVolumeSliceControlsDragEvent) {
    const { movedY, deltaY } = e;
    if (!movedY) return;

    const maxAmount = 3;
    let amount = deltaY;

    if (deltaY > 0) {
      amount = Math.min(deltaY, maxAmount);
    } else {
      amount = Math.max(deltaY, -maxAmount);
    }

    this.volumeSlice.incrementIndex(amount);
    this.volumeSlice.repaint();
  }

  private zoomDragHandler(e: MPRVolumeSliceControlsDragEvent) {
    const { movedY, deltaY } = e;
    if (!movedY) return;

    let amount = deltaY * 0.035;
    this.camera.zoomBy(-amount);
  }

  private zoomWheelHandler(e: WheelEvent) {
    e.preventDefault();

    const { spinY } = normalizeWheel(e);
    const amount = spinY * 0.1;

    this.camera.zoomBy(-amount);
  }

  private addDragHandler(
    method: ControlMethod,
    callback: (e: MPRVolumeSliceControlsDragEvent) => void
  ) {
    this.cancelDragHandler(method);

    let dragAbortController = this.dragAbortControllers.get(method);
    if (!dragAbortController) {
      dragAbortController = new AbortController();
      this.dragAbortControllers.set(method, dragAbortController);
    }

    const { signal } = dragAbortController;

    /**
     * @TODO implement drag for touch device events
     */

    if (method === ControlMethod.Secondary) {
      this.domElement.addEventListener(
        'contextmenu',
        (e) => e.preventDefault(),
        { signal }
      );
    }

    this.domElement.addEventListener(
      'mousedown',
      (e: MouseEvent) => {
        const { button } = e;

        this.onDragStart(button);
      },
      { signal }
    );
    this.domElement.addEventListener('mouseup', () => this.onDragEnd(), {
      signal,
    });
    this.domElement.addEventListener('mouseleave', () => this.onDragEnd(), {
      signal,
    });
    this.domElement.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDragging(method)) {
        e.preventDefault();
        e.stopPropagation();

        const { movementX, movementY } = e;
        if (
          (movementX !== 0 || movementY !== 0) &&
          this.draggingTimeout === -1
        ) {
          this.draggingTimeout = setTimeout(() => {
            callback({
              event: e,
              movedX: movementX !== 0,
              movedY: movementY !== 0,
              deltaX: movementX,
              deltaY: movementY,
            });
            clearTimeout(this.draggingTimeout);
            this.draggingTimeout = -1;
          });
        }
      }
    });
  }

  private cancelDragHandler(method: ControlMethod) {
    const dragAbortController = this.dragAbortControllers.get(method);

    if (!dragAbortController) return;

    dragAbortController.abort();
    this.dragging = false;
  }

  private addWheelHandler(callback: (e: WheelEvent) => void) {
    this.cancelWheelHandler();

    const { signal } = this.wheelAbortController;
    this.domElement.addEventListener('wheel', callback, { signal });
  }

  private cancelWheelHandler() {
    this.wheelAbortController.abort();
    this.wheelAbortController = new AbortController();
  }

  private onDragStart(button: number) {
    this.dragging = true;
    this.draggingButton = button;
  }

  private onDragEnd() {
    this.dragging = false;
    this.draggingButton = -1;
  }

  private isDragging(method: ControlMethod) {
    return (
      this.dragging &&
      ((method === ControlMethod.Primary && this.draggingButton === 0) ||
        (method === ControlMethod.Secondary && this.draggingButton === 2))
    );
  }
}
