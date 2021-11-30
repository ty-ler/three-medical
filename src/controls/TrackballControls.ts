import {
  EventDispatcher,
  MOUSE,
  Object3D,
  Quaternion,
  Vector2,
  Vector3,
} from 'three';

const _changeEvent = { type: 'change' };
const _startEvent = { type: 'start' };
const _endEvent = { type: 'end' };

const STATE = {
  NONE: -1,
  ROTATE: 0,
  ZOOM: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_ZOOM_PAN: 4,
};

const EPS = 0.000001;

export class TrackballControls extends EventDispatcher {
  public object: any;
  public domElement: HTMLElement;
  public enabled: boolean;
  public screen: { left: number; top: number; width: number; height: number };
  public rotateSpeed: number;
  public zoomSpeed: number;
  public panSpeed: number;
  public noRotate: boolean;
  public noZoom: boolean;
  public noPan: boolean;
  public staticMoving: boolean;
  public dynamicDampingFactor: number;
  public minDistance: number;
  public maxDistance: number;
  public mouseButtons: { [key: string]: MOUSE };

  public target: Vector3;

  public target0: Vector3;
  public position0: Vector3;
  public up0: Vector3;
  public zoom0: number;

  public active: boolean = false;

  // Rotate
  private axis = new Vector3();
  private quaternion = new Quaternion();
  private eyeDirection = new Vector3();
  private objectUpDirection = new Vector3();
  private objectSidewaysDirection = new Vector3();
  private moveDirection = new Vector3();

  // Pan
  private mouseChange = new Vector2();
  private objectUp = new Vector3();
  private pan = new Vector3();

  private _eye = new Vector3();
  private _movePrev = new Vector2();
  private _moveCurr = new Vector2();
  private _lastAxis = new Vector3();
  private _zoomStart = new Vector2();
  private _zoomEnd = new Vector2();
  private _panStart = new Vector2();
  private _panEnd = new Vector2();
  private _pointers: any[] = [];
  private _pointerPositions: any = {};

  private _state = STATE.NONE;
  private _keyState = STATE.NONE;
  private _touchZoomDistanceStart = 0;
  private _touchZoomDistanceEnd = 0;
  private _lastAngle = 0;

  private lastPosition = new Vector3();
  private lastZoom = 1;

  private mouseOnCircle = new Vector2();
  private mouseOnScreen = new Vector2();

  constructor(object: Object3D, domElement: HTMLElement) {
    super();

    if (domElement === undefined)
      console.warn(
        'THREE.TrackballControls: The second parameter "domElement" is now mandatory.'
      );
    if (domElement === (document as any))
      console.error(
        'THREE.TrackballControls: "document" should not be used as the target "domElement". Please use "renderer.domElement" instead.'
      );

    this.object = object;
    this.domElement = domElement;
    this.domElement.style.touchAction = 'none'; // disable touch scroll

    // API

    this.enabled = true;

    this.screen = { left: 0, top: 0, width: 0, height: 0 };

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.2;
    this.panSpeed = 0.3;

    this.noRotate = false;
    this.noZoom = false;
    this.noPan = false;

    this.staticMoving = false;
    this.dynamicDampingFactor = 0.2;

    this.minDistance = 0;
    this.maxDistance = Infinity;

    this.mouseButtons = {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    };

    // internals

    this.target = new Vector3();

    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.up0 = this.object.up.clone();
    this.zoom0 = this.object.zoom;

    this.contextmenu = this.contextmenu.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerCancel = this.onPointerCancel.bind(this);
    this.onMouseWheel = this.onMouseWheel.bind(this);
    this.keydown = this.keydown.bind(this);

    this.domElement.addEventListener('contextmenu', this.contextmenu);

    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointercancel', this.onPointerCancel);
    this.domElement.addEventListener('wheel', this.onMouseWheel, {
      passive: false,
    });

    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);

    this.handleResize();

    // force an update at start
    this.update();
  }

  // methods

  handleResize() {
    const box = this.domElement.getBoundingClientRect();
    // adjustments come from similar code in the jquery offset() function
    const d = this.domElement.ownerDocument.documentElement;
    this.screen.left = box.left + window.pageXOffset - d.clientLeft;
    this.screen.top = box.top + window.pageYOffset - d.clientTop;
    this.screen.width = box.width;
    this.screen.height = box.height;
  }

  getMouseOnScreen(pageX: number, pageY: number) {
    this.mouseOnScreen.set(
      (pageX - this.screen.left) / this.screen.width,
      (pageY - this.screen.top) / this.screen.height
    );
    return this.mouseOnScreen;
  }

  getMouseOnCircle(pageX: number, pageY: number) {
    this.mouseOnCircle.set(
      (pageX - this.screen.width * 0.5 - this.screen.left) /
        (this.screen.width * 0.5),
      (this.screen.height + 2 * (this.screen.top - pageY)) / this.screen.width // screen.width intentional
    );
    return this.mouseOnCircle;
  }

  rotateCamera() {
    this.moveDirection.set(
      this._moveCurr.x - this._movePrev.x,
      this._moveCurr.y - this._movePrev.y,
      0
    );
    let angle = this.moveDirection.length();
    // console.log(
    //   this._moveCurr.toArray(),
    //   this._movePrev.toArray(),
    //   this.moveDirection.toArray()
    // );

    if (angle) {
      this._eye.copy(this.object.position).sub(this.target);

      this.eyeDirection.copy(this._eye).normalize();
      this.objectUpDirection.copy(this.object.up).normalize();
      this.objectSidewaysDirection
        .crossVectors(this.objectUpDirection, this.eyeDirection)
        .normalize();

      this.objectUpDirection.setLength(this._moveCurr.y - this._movePrev.y);
      this.objectSidewaysDirection.setLength(
        this._moveCurr.x - this._movePrev.x
      );

      this.moveDirection.copy(
        this.objectUpDirection.add(this.objectSidewaysDirection)
      );

      this.axis.crossVectors(this.moveDirection, this._eye).normalize();

      angle *= this.rotateSpeed;
      this.quaternion.setFromAxisAngle(this.axis, angle);

      this._eye.applyQuaternion(this.quaternion);
      this.object.up.applyQuaternion(this.quaternion);

      this._lastAxis.copy(this.axis);
      this._lastAngle = angle;
    } else if (!this.staticMoving && this._lastAngle) {
      this._lastAngle *= Math.sqrt(1.0 - this.dynamicDampingFactor);
      this._eye.copy(this.object.position).sub(this.target);
      this.quaternion.setFromAxisAngle(this._lastAxis, this._lastAngle);
      this._eye.applyQuaternion(this.quaternion);
      this.object.up.applyQuaternion(this.quaternion);
    }

    this._movePrev.copy(this._moveCurr);
  }

  zoomCamera() {
    let factor;

    if (this._state === STATE.TOUCH_ZOOM_PAN) {
      factor = this._touchZoomDistanceStart / this._touchZoomDistanceEnd;
      this._touchZoomDistanceStart = this._touchZoomDistanceEnd;

      if (this.object.isPerspectiveCamera) {
        this._eye.multiplyScalar(factor);
      } else if (this.object.isOrthographicCamera) {
        this.object.zoom /= factor;
        this.object.updateProjectionMatrix();
      } else {
        console.warn('THREE.TrackballControls: Unsupported camera type');
      }
    } else {
      factor = 1.0 + (this._zoomEnd.y - this._zoomStart.y) * this.zoomSpeed;

      if (factor !== 1.0 && factor > 0.0) {
        if (this.object.isPerspectiveCamera) {
          this._eye.multiplyScalar(factor);
        } else if (this.object.isOrthographicCamera) {
          this.object.zoom /= factor;
          this.object.updateProjectionMatrix();
        } else {
          console.warn('THREE.TrackballControls: Unsupported camera type');
        }
      }

      if (this.staticMoving) {
        this._zoomStart.copy(this._zoomEnd);
      } else {
        this._zoomStart.y +=
          (this._zoomEnd.y - this._zoomStart.y) * this.dynamicDampingFactor;
      }
    }
  }

  panCamera() {
    this.mouseChange.copy(this._panEnd).sub(this._panStart);

    if (this.mouseChange.lengthSq()) {
      if (this.object.isOrthographicCamera) {
        const scale_x =
          (this.object.right - this.object.left) /
          this.object.zoom /
          this.domElement.clientWidth;
        const scale_y =
          (this.object.top - this.object.bottom) /
          this.object.zoom /
          this.domElement.clientWidth;

        this.mouseChange.x *= scale_x;
        this.mouseChange.y *= scale_y;
      }

      this.mouseChange.multiplyScalar(this._eye.length() * this.panSpeed);

      this.pan
        .copy(this._eye)
        .cross(this.object.up)
        .setLength(this.mouseChange.x);
      this.pan.add(
        this.objectUp.copy(this.object.up).setLength(this.mouseChange.y)
      );

      this.object.position.add(this.pan);
      this.target.add(this.pan);

      if (this.staticMoving) {
        this._panStart.copy(this._panEnd);
      } else {
        this._panStart.add(
          this.mouseChange
            .subVectors(this._panEnd, this._panStart)
            .multiplyScalar(this.dynamicDampingFactor)
        );
      }
    }
  }

  checkDistances() {
    if (!this.noZoom || !this.noPan) {
      if (this._eye.lengthSq() > this.maxDistance * this.maxDistance) {
        this.object.position.addVectors(
          this.target,
          this._eye.setLength(this.maxDistance)
        );
        this._zoomStart.copy(this._zoomEnd);
      }

      if (this._eye.lengthSq() < this.minDistance * this.minDistance) {
        this.object.position.addVectors(
          this.target,
          this._eye.setLength(this.minDistance)
        );
        this._zoomStart.copy(this._zoomEnd);
      }
    }
  }

  update() {
    this._eye.subVectors(this.object.position, this.target);

    if (!this.noRotate) {
      this.rotateCamera();
    }

    if (!this.noZoom) {
      this.zoomCamera();
    }

    if (!this.noPan) {
      this.panCamera();
    }

    this.object.position.addVectors(this.target, this._eye);

    if (this.object.isPerspectiveCamera) {
      this.checkDistances();

      this.object.lookAt(this.target);

      if (this.lastPosition.distanceToSquared(this.object.position) > EPS) {
        this.dispatchEvent(_changeEvent);

        this.lastPosition.copy(this.object.position);
      }
    } else if (this.object.isOrthographicCamera) {
      this.object.lookAt(this.target);

      if (
        this.lastPosition.distanceToSquared(this.object.position) > EPS ||
        this.lastZoom !== this.object.zoom
      ) {
        this.dispatchEvent(_changeEvent);

        this.lastPosition.copy(this.object.position);
        this.lastZoom = this.object.zoom;
      }
    } else {
      console.warn('THREE.TrackballControls: Unsupported camera type');
    }
  }

  reset() {
    this._state = STATE.NONE;
    this._keyState = STATE.NONE;

    this.target.copy(this.target0);
    this.object.position.copy(this.position0);
    this.object.up.copy(this.up0);
    this.object.zoom = this.zoom0;

    this.object.updateProjectionMatrix();

    this._eye.subVectors(this.object.position, this.target);

    this.object.lookAt(this.target);

    this.dispatchEvent(_changeEvent);

    this.lastPosition.copy(this.object.position);
    this.lastZoom = this.object.zoom;
  }

  // listeners

  onPointerDown(event: PointerEvent) {
    if (this.enabled === false) return;

    if (this._pointers.length === 0) {
      this.domElement.setPointerCapture(event.pointerId);

      this.domElement.addEventListener('pointermove', this.onPointerMove);
      this.domElement.addEventListener('pointerup', this.onPointerUp);
    }

    //

    this.addPointer(event);

    if (event.pointerType === 'touch') {
      this.onTouchStart(event);
    } else {
      this.onMouseDown(event);
    }
  }

  onPointerMove(event: PointerEvent) {
    if (this.enabled === false) return;

    if (event.pointerType === 'touch') {
      this.onTouchMove(event);
    } else {
      this.onMouseMove(event);
    }
  }

  onPointerUp(event: PointerEvent) {
    if (this.enabled === false) return;

    if (event.pointerType === 'touch') {
      this.onTouchEnd(event);
    } else {
      this.onMouseUp();
    }

    //

    this.removePointer(event);

    console.log(this._pointers);

    if (this._pointers.length === 0) {
      this.domElement.releasePointerCapture(event.pointerId);

      this.domElement.removeEventListener('pointermove', this.onPointerMove);
      this.domElement.removeEventListener('pointerup', this.onPointerUp);
    }
  }

  onPointerCancel(event: PointerEvent) {
    this.removePointer(event);
  }

  keydown(event: KeyboardEvent) {
    if (this.enabled === false) return;

    window.removeEventListener('keydown', this.keydown);

    if (this._keyState !== STATE.NONE) {
      return;
    } else if (
      (event.code === 'AltLeft' || event.code === 'AltRight') &&
      !this.noRotate
    ) {
      this._keyState = STATE.ROTATE;
    } else if (
      (event.code === 'ControlLeft' || event.code === 'ControlRight') &&
      !this.noZoom
    ) {
      this._keyState = STATE.ZOOM;
    } else if (
      (event.code === 'ShiftLeft' || event.code === 'ShiftRight') &&
      !this.noPan
    ) {
      this._keyState = STATE.PAN;
    }

    console.log(this._keyState);
  }

  keyup() {
    if (this.enabled === false) return;

    this._keyState = STATE.NONE;

    window.addEventListener('keydown', this.keydown);
  }

  onMouseDown(event: PointerEvent) {
    if (this._state === STATE.NONE) {
      switch (event.button) {
        case this.mouseButtons.LEFT:
          this._state = STATE.ROTATE;
          break;

        case this.mouseButtons.MIDDLE:
          this._state = STATE.ZOOM;
          break;

        case this.mouseButtons.RIGHT:
          this._state = STATE.PAN;
          break;

        default:
          this._state = STATE.NONE;
      }
    }

    const state = this._keyState !== STATE.NONE ? this._keyState : this._state;

    if (state === STATE.ROTATE && !this.noRotate) {
      this._moveCurr.copy(this.getMouseOnCircle(event.pageX, event.pageY));
      this._movePrev.copy(this._moveCurr);
    } else if (state === STATE.ZOOM && !this.noZoom) {
      this._zoomStart.copy(this.getMouseOnScreen(event.pageX, event.pageY));
      this._zoomEnd.copy(this._zoomStart);
    } else if (state === STATE.PAN && !this.noPan) {
      this._panStart.copy(this.getMouseOnScreen(event.pageX, event.pageY));
      this._panEnd.copy(this._panStart);
    }

    this.dispatchEvent(_startEvent);
  }

  onMouseMove(event: PointerEvent) {
    const state = this._keyState !== STATE.NONE ? this._keyState : this._state;

    if (state === STATE.ROTATE && !this.noRotate) {
      this._movePrev.copy(this._moveCurr);
      this._moveCurr.copy(this.getMouseOnCircle(event.pageX, event.pageY));
    } else if (state === STATE.ZOOM && !this.noZoom) {
      this._zoomEnd.copy(this.getMouseOnScreen(event.pageX, event.pageY));
    } else if (state === STATE.PAN && !this.noPan) {
      this._panEnd.copy(this.getMouseOnScreen(event.pageX, event.pageY));
    }
  }

  onMouseUp() {
    this._state = STATE.NONE;

    this.dispatchEvent(_endEvent);
  }

  onMouseWheel(event: WheelEvent) {
    if (this.enabled === false) return;

    if (this.noZoom === true) return;

    event.preventDefault();

    switch (event.deltaMode) {
      case 2:
        // Zoom in pages
        this._zoomStart.y -= event.deltaY * 0.025;
        break;

      case 1:
        // Zoom in lines
        this._zoomStart.y -= event.deltaY * 0.01;
        break;

      default:
        // undefined, 0, assume pixels
        this._zoomStart.y -= event.deltaY * 0.00025;
        break;
    }

    this.dispatchEvent(_startEvent);
    this.dispatchEvent(_endEvent);
  }

  onTouchStart(event: PointerEvent) {
    this.trackPointer(event);

    switch (this._pointers.length) {
      case 1:
        this._state = STATE.TOUCH_ROTATE;
        this._moveCurr.copy(
          this.getMouseOnCircle(
            this._pointers[0].pageX,
            this._pointers[0].pageY
          )
        );
        this._movePrev.copy(this._moveCurr);
        break;

      default:
        // 2 or more
        this._state = STATE.TOUCH_ZOOM_PAN;
        const dx = this._pointers[0].pageX - this._pointers[1].pageX;
        const dy = this._pointers[0].pageY - this._pointers[1].pageY;
        this._touchZoomDistanceEnd = this._touchZoomDistanceStart = Math.sqrt(
          dx * dx + dy * dy
        );

        const x = (this._pointers[0].pageX + this._pointers[1].pageX) / 2;
        const y = (this._pointers[0].pageY + this._pointers[1].pageY) / 2;
        this._panStart.copy(this.getMouseOnScreen(x, y));
        this._panEnd.copy(this._panStart);
        break;
    }

    this.dispatchEvent(_startEvent);
  }

  onTouchMove(event: PointerEvent) {
    this.trackPointer(event);

    switch (this._pointers.length) {
      case 1:
        this._movePrev.copy(this._moveCurr);
        this._moveCurr.copy(this.getMouseOnCircle(event.pageX, event.pageY));
        break;

      default:
        // 2 or more

        const position = this.getSecondPointerPosition(event);

        const dx = event.pageX - position.x;
        const dy = event.pageY - position.y;
        this._touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy);

        const x = (event.pageX + position.x) / 2;
        const y = (event.pageY + position.y) / 2;
        this._panEnd.copy(this.getMouseOnScreen(x, y));
        break;
    }
  }

  onTouchEnd(event: PointerEvent) {
    switch (this._pointers.length) {
      case 0:
        this._state = STATE.NONE;
        break;

      case 1:
        this._state = STATE.TOUCH_ROTATE;
        this._moveCurr.copy(this.getMouseOnCircle(event.pageX, event.pageY));
        this._movePrev.copy(this._moveCurr);
        break;

      case 2:
        this._state = STATE.TOUCH_ZOOM_PAN;
        this._moveCurr.copy(
          this.getMouseOnCircle(
            event.pageX - (this._movePrev as any).pageX,
            event.pageY - (this._movePrev as any).pageY
          )
        );
        this._movePrev.copy(this._moveCurr);
        break;
    }

    this.dispatchEvent(_endEvent);
  }

  contextmenu(event: MouseEvent) {
    if (this.enabled === false) return;

    event.preventDefault();
  }

  addPointer(event: PointerEvent) {
    this._pointers.push(event);
  }

  removePointer(event: PointerEvent) {
    delete this._pointerPositions[event.pointerId];

    for (let i = 0; i < this._pointers.length; i++) {
      if (this._pointers[i].pointerId == event.pointerId) {
        this._pointers.splice(i, 1);
        return;
      }
    }
  }

  trackPointer(event: PointerEvent) {
    let position = this._pointerPositions[event.pointerId];

    if (position === undefined) {
      position = new Vector2();
      this._pointerPositions[event.pointerId] = position;
    }

    position.set(event.pageX, event.pageY);
  }

  getSecondPointerPosition(event: PointerEvent) {
    const pointer =
      event.pointerId === this._pointers[0].pointerId
        ? this._pointers[1]
        : this._pointers[0];

    return this._pointerPositions[pointer.pointerId];
  }

  dispose() {
    this.domElement.removeEventListener('contextmenu', this.contextmenu);

    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointercancel', this.onPointerCancel);
    this.domElement.removeEventListener('wheel', this.onMouseWheel);

    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);

    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
  }
}
