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

export class TrackballControls extends EventDispatcher {
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

    const scope: any = this;
    const STATE = {
      NONE: -1,
      ROTATE: 0,
      ZOOM: 1,
      PAN: 2,
      TOUCH_ROTATE: 3,
      TOUCH_ZOOM_PAN: 4,
    };

    scope.object = object;
    scope.domElement = domElement;
    scope.domElement.style.touchAction = 'none'; // disable touch scroll

    // API

    scope.enabled = true;

    scope.screen = { left: 0, top: 0, width: 0, height: 0 };

    scope.rotateSpeed = 1.0;
    scope.zoomSpeed = 1.2;
    scope.panSpeed = 0.3;

    scope.noRotate = false;
    scope.noZoom = false;
    scope.noPan = false;

    scope.staticMoving = false;
    scope.dynamicDampingFactor = 0.2;

    scope.minDistance = 0;
    scope.maxDistance = Infinity;

    scope.keys = ['KeyA' /*A*/, 'KeyS' /*S*/, 'KeyD' /*D*/];

    scope.mouseButtons = {
      LEFT: MOUSE.ROTATE,
      MIDDLE: MOUSE.DOLLY,
      RIGHT: MOUSE.PAN,
    };

    // internals

    scope.target = new Vector3();

    const EPS = 0.000001;

    const lastPosition = new Vector3();
    let lastZoom = 1;

    let _state = STATE.NONE,
      _keyState = STATE.NONE,
      _touchZoomDistanceStart = 0,
      _touchZoomDistanceEnd = 0,
      _lastAngle = 0;

    const _eye = new Vector3(),
      _movePrev = new Vector2(),
      _moveCurr = new Vector2(),
      _lastAxis = new Vector3(),
      _zoomStart = new Vector2(),
      _zoomEnd = new Vector2(),
      _panStart = new Vector2(),
      _panEnd = new Vector2(),
      _pointers: any[] = [],
      _pointerPositions: any = {};

    // for reset

    scope.target0 = scope.target.clone();
    scope.position0 = scope.object.position.clone();
    scope.up0 = scope.object.up.clone();
    scope.zoom0 = scope.object.zoom;

    // methods

    scope.handleResize = function () {
      const box = scope.domElement.getBoundingClientRect();
      // adjustments come from similar code in the jquery offset() function
      const d = scope.domElement.ownerDocument.documentElement;
      scope.screen.left = box.left + window.pageXOffset - d.clientLeft;
      scope.screen.top = box.top + window.pageYOffset - d.clientTop;
      scope.screen.width = box.width;
      scope.screen.height = box.height;
    };

    const getMouseOnScreen = (function () {
      const vector = new Vector2();

      return function getMouseOnScreen(pageX: number, pageY: number) {
        vector.set(
          (pageX - scope.screen.left) / scope.screen.width,
          (pageY - scope.screen.top) / scope.screen.height
        );

        return vector;
      };
    })();

    const getMouseOnCircle = (function () {
      const vector = new Vector2();

      return function getMouseOnCircle(pageX: number, pageY: number) {
        vector.set(
          (pageX - scope.screen.width * 0.5 - scope.screen.left) /
            (scope.screen.width * 0.5),
          (scope.screen.height + 2 * (scope.screen.top - pageY)) /
            scope.screen.width // screen.width intentional
        );

        return vector;
      };
    })();

    scope.rotateCamera = (function () {
      const axis = new Vector3(),
        quaternion = new Quaternion(),
        eyeDirection = new Vector3(),
        objectUpDirection = new Vector3(),
        objectSidewaysDirection = new Vector3(),
        moveDirection = new Vector3();

      return function rotateCamera() {
        moveDirection.set(
          _moveCurr.x - _movePrev.x,
          _moveCurr.y - _movePrev.y,
          0
        );
        let angle = moveDirection.length();

        // console.log(
        //   _moveCurr.toArray(),
        //   _movePrev.toArray(),
        //   moveDirection.toArray()
        // );

        if (angle) {
          _eye.copy(scope.object.position).sub(scope.target);

          eyeDirection.copy(_eye).normalize();
          objectUpDirection.copy(scope.object.up).normalize();
          objectSidewaysDirection
            .crossVectors(objectUpDirection, eyeDirection)
            .normalize();

          objectUpDirection.setLength(_moveCurr.y - _movePrev.y);
          objectSidewaysDirection.setLength(_moveCurr.x - _movePrev.x);

          moveDirection.copy(objectUpDirection.add(objectSidewaysDirection));

          axis.crossVectors(moveDirection, _eye).normalize();

          angle *= scope.rotateSpeed;
          quaternion.setFromAxisAngle(axis, angle);

          _eye.applyQuaternion(quaternion);
          scope.object.up.applyQuaternion(quaternion);

          _lastAxis.copy(axis);
          _lastAngle = angle;
        } else if (!scope.staticMoving && _lastAngle) {
          _lastAngle *= Math.sqrt(1.0 - scope.dynamicDampingFactor);
          _eye.copy(scope.object.position).sub(scope.target);
          quaternion.setFromAxisAngle(_lastAxis, _lastAngle);
          _eye.applyQuaternion(quaternion);
          scope.object.up.applyQuaternion(quaternion);
        }

        _movePrev.copy(_moveCurr);
      };
    })();

    scope.zoomCamera = function () {
      let factor;

      if (_state === STATE.TOUCH_ZOOM_PAN) {
        factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
        _touchZoomDistanceStart = _touchZoomDistanceEnd;

        if (scope.object.isPerspectiveCamera) {
          _eye.multiplyScalar(factor);
        } else if (scope.object.isOrthographicCamera) {
          scope.object.zoom /= factor;
          scope.object.updateProjectionMatrix();
        } else {
          console.warn('THREE.TrackballControls: Unsupported camera type');
        }
      } else {
        factor = 1.0 + (_zoomEnd.y - _zoomStart.y) * scope.zoomSpeed;

        if (factor !== 1.0 && factor > 0.0) {
          if (scope.object.isPerspectiveCamera) {
            _eye.multiplyScalar(factor);
          } else if (scope.object.isOrthographicCamera) {
            scope.object.zoom /= factor;
            scope.object.updateProjectionMatrix();
          } else {
            console.warn('THREE.TrackballControls: Unsupported camera type');
          }
        }

        if (scope.staticMoving) {
          _zoomStart.copy(_zoomEnd);
        } else {
          _zoomStart.y +=
            (_zoomEnd.y - _zoomStart.y) * scope.dynamicDampingFactor;
        }
      }
    };

    scope.panCamera = (function () {
      const mouseChange = new Vector2(),
        objectUp = new Vector3(),
        pan = new Vector3();

      return function panCamera() {
        mouseChange.copy(_panEnd).sub(_panStart);

        if (mouseChange.lengthSq()) {
          if (scope.object.isOrthographicCamera) {
            const scale_x =
              (scope.object.right - scope.object.left) /
              scope.object.zoom /
              scope.domElement.clientWidth;
            const scale_y =
              (scope.object.top - scope.object.bottom) /
              scope.object.zoom /
              scope.domElement.clientWidth;

            mouseChange.x *= scale_x;
            mouseChange.y *= scale_y;
          }

          mouseChange.multiplyScalar(_eye.length() * scope.panSpeed);

          pan.copy(_eye).cross(scope.object.up).setLength(mouseChange.x);
          pan.add(objectUp.copy(scope.object.up).setLength(mouseChange.y));

          scope.object.position.add(pan);
          scope.target.add(pan);

          if (scope.staticMoving) {
            _panStart.copy(_panEnd);
          } else {
            _panStart.add(
              mouseChange
                .subVectors(_panEnd, _panStart)
                .multiplyScalar(scope.dynamicDampingFactor)
            );
          }
        }
      };
    })();

    scope.checkDistances = function () {
      if (!scope.noZoom || !scope.noPan) {
        if (_eye.lengthSq() > scope.maxDistance * scope.maxDistance) {
          scope.object.position.addVectors(
            scope.target,
            _eye.setLength(scope.maxDistance)
          );
          _zoomStart.copy(_zoomEnd);
        }

        if (_eye.lengthSq() < scope.minDistance * scope.minDistance) {
          scope.object.position.addVectors(
            scope.target,
            _eye.setLength(scope.minDistance)
          );
          _zoomStart.copy(_zoomEnd);
        }
      }
    };

    scope.update = function () {
      _eye.subVectors(scope.object.position, scope.target);

      if (!scope.noRotate) {
        scope.rotateCamera();
      }

      if (!scope.noZoom) {
        scope.zoomCamera();
      }

      if (!scope.noPan) {
        scope.panCamera();
      }

      scope.object.position.addVectors(scope.target, _eye);

      if (scope.object.isPerspectiveCamera) {
        scope.checkDistances();

        scope.object.lookAt(scope.target);

        if (lastPosition.distanceToSquared(scope.object.position) > EPS) {
          scope.dispatchEvent(_changeEvent);

          lastPosition.copy(scope.object.position);
        }
      } else if (scope.object.isOrthographicCamera) {
        scope.object.lookAt(scope.target);

        if (
          lastPosition.distanceToSquared(scope.object.position) > EPS ||
          lastZoom !== scope.object.zoom
        ) {
          scope.dispatchEvent(_changeEvent);

          lastPosition.copy(scope.object.position);
          lastZoom = scope.object.zoom;
        }
      } else {
        console.warn('THREE.TrackballControls: Unsupported camera type');
      }
    };

    scope.reset = function () {
      _state = STATE.NONE;
      _keyState = STATE.NONE;

      scope.target.copy(scope.target0);
      scope.object.position.copy(scope.position0);
      scope.object.up.copy(scope.up0);
      scope.object.zoom = scope.zoom0;

      scope.object.updateProjectionMatrix();

      _eye.subVectors(scope.object.position, scope.target);

      scope.object.lookAt(scope.target);

      scope.dispatchEvent(_changeEvent);

      lastPosition.copy(scope.object.position);
      lastZoom = scope.object.zoom;
    };

    // listeners

    function onPointerDown(event: PointerEvent) {
      if (scope.enabled === false) return;

      if (_pointers.length === 0) {
        scope.domElement.setPointerCapture(event.pointerId);

        scope.domElement.addEventListener('pointermove', onPointerMove);
        scope.domElement.addEventListener('pointerup', onPointerUp);
      }

      //

      addPointer(event);

      if (event.pointerType === 'touch') {
        onTouchStart(event);
      } else {
        onMouseDown(event);
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (scope.enabled === false) return;

      if (event.pointerType === 'touch') {
        onTouchMove(event);
      } else {
        onMouseMove(event);
      }
    }

    function onPointerUp(event: PointerEvent) {
      if (scope.enabled === false) return;

      if (event.pointerType === 'touch') {
        onTouchEnd(event);
      } else {
        onMouseUp();
      }

      //

      removePointer(event);

      console.log(_pointers);

      if (_pointers.length === 0) {
        scope.domElement.releasePointerCapture(event.pointerId);

        scope.domElement.removeEventListener('pointermove', onPointerMove);
        scope.domElement.removeEventListener('pointerup', onPointerUp);
      }
    }

    function onPointerCancel(event: PointerEvent) {
      removePointer(event);
    }

    function keydown(event: KeyboardEvent) {
      if (scope.enabled === false) return;

      window.removeEventListener('keydown', keydown);

      if (_keyState !== STATE.NONE) {
        return;
      } else if (event.code === scope.keys[STATE.ROTATE] && !scope.noRotate) {
        _keyState = STATE.ROTATE;
      } else if (event.code === scope.keys[STATE.ZOOM] && !scope.noZoom) {
        _keyState = STATE.ZOOM;
      } else if (event.code === scope.keys[STATE.PAN] && !scope.noPan) {
        _keyState = STATE.PAN;
      }
    }

    function keyup() {
      if (scope.enabled === false) return;

      _keyState = STATE.NONE;

      window.addEventListener('keydown', keydown);
    }

    function onMouseDown(event: PointerEvent) {
      if (_state === STATE.NONE) {
        switch (event.button) {
          case scope.mouseButtons.LEFT:
            _state = STATE.ROTATE;
            break;

          case scope.mouseButtons.MIDDLE:
            _state = STATE.ZOOM;
            break;

          case scope.mouseButtons.RIGHT:
            _state = STATE.PAN;
            break;

          default:
            _state = STATE.NONE;
        }
      }

      const state = _keyState !== STATE.NONE ? _keyState : _state;

      if (state === STATE.ROTATE && !scope.noRotate) {
        _moveCurr.copy(getMouseOnCircle(event.pageX, event.pageY));
        _movePrev.copy(_moveCurr);
      } else if (state === STATE.ZOOM && !scope.noZoom) {
        _zoomStart.copy(getMouseOnScreen(event.pageX, event.pageY));
        _zoomEnd.copy(_zoomStart);
      } else if (state === STATE.PAN && !scope.noPan) {
        _panStart.copy(getMouseOnScreen(event.pageX, event.pageY));
        _panEnd.copy(_panStart);
      }

      scope.dispatchEvent(_startEvent);
    }

    function onMouseMove(event: PointerEvent) {
      const state = _keyState !== STATE.NONE ? _keyState : _state;

      if (state === STATE.ROTATE && !scope.noRotate) {
        _movePrev.copy(_moveCurr);
        _moveCurr.copy(getMouseOnCircle(event.pageX, event.pageY));
      } else if (state === STATE.ZOOM && !scope.noZoom) {
        _zoomEnd.copy(getMouseOnScreen(event.pageX, event.pageY));
      } else if (state === STATE.PAN && !scope.noPan) {
        _panEnd.copy(getMouseOnScreen(event.pageX, event.pageY));
      }
    }

    function onMouseUp() {
      _state = STATE.NONE;

      scope.dispatchEvent(_endEvent);
    }

    function onMouseWheel(event: WheelEvent) {
      if (scope.enabled === false) return;

      if (scope.noZoom === true) return;

      event.preventDefault();

      switch (event.deltaMode) {
        case 2:
          // Zoom in pages
          _zoomStart.y -= event.deltaY * 0.025;
          break;

        case 1:
          // Zoom in lines
          _zoomStart.y -= event.deltaY * 0.01;
          break;

        default:
          // undefined, 0, assume pixels
          _zoomStart.y -= event.deltaY * 0.00025;
          break;
      }

      scope.dispatchEvent(_startEvent);
      scope.dispatchEvent(_endEvent);
    }

    function onTouchStart(event: PointerEvent) {
      trackPointer(event);

      switch (_pointers.length) {
        case 1:
          _state = STATE.TOUCH_ROTATE;
          _moveCurr.copy(
            getMouseOnCircle(_pointers[0].pageX, _pointers[0].pageY)
          );
          _movePrev.copy(_moveCurr);
          break;

        default:
          // 2 or more
          _state = STATE.TOUCH_ZOOM_PAN;
          const dx = _pointers[0].pageX - _pointers[1].pageX;
          const dy = _pointers[0].pageY - _pointers[1].pageY;
          _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt(
            dx * dx + dy * dy
          );

          const x = (_pointers[0].pageX + _pointers[1].pageX) / 2;
          const y = (_pointers[0].pageY + _pointers[1].pageY) / 2;
          _panStart.copy(getMouseOnScreen(x, y));
          _panEnd.copy(_panStart);
          break;
      }

      scope.dispatchEvent(_startEvent);
    }

    function onTouchMove(event: PointerEvent) {
      trackPointer(event);

      switch (_pointers.length) {
        case 1:
          _movePrev.copy(_moveCurr);
          _moveCurr.copy(getMouseOnCircle(event.pageX, event.pageY));
          break;

        default:
          // 2 or more

          const position = getSecondPointerPosition(event);

          const dx = event.pageX - position.x;
          const dy = event.pageY - position.y;
          _touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy);

          const x = (event.pageX + position.x) / 2;
          const y = (event.pageY + position.y) / 2;
          _panEnd.copy(getMouseOnScreen(x, y));
          break;
      }
    }

    function onTouchEnd(event: PointerEvent) {
      switch (_pointers.length) {
        case 0:
          _state = STATE.NONE;
          break;

        case 1:
          _state = STATE.TOUCH_ROTATE;
          _moveCurr.copy(getMouseOnCircle(event.pageX, event.pageY));
          _movePrev.copy(_moveCurr);
          break;

        case 2:
          _state = STATE.TOUCH_ZOOM_PAN;
          _moveCurr.copy(
            getMouseOnCircle(
              event.pageX - (_movePrev as any).pageX,
              event.pageY - (_movePrev as any).pageY
            )
          );
          _movePrev.copy(_moveCurr);
          break;
      }

      scope.dispatchEvent(_endEvent);
    }

    function contextmenu(event: PointerEvent) {
      if (scope.enabled === false) return;

      event.preventDefault();
    }

    function addPointer(event: PointerEvent) {
      _pointers.push(event);
    }

    function removePointer(event: PointerEvent) {
      delete _pointerPositions[event.pointerId];

      for (let i = 0; i < _pointers.length; i++) {
        if (_pointers[i].pointerId == event.pointerId) {
          _pointers.splice(i, 1);
          return;
        }
      }
    }

    function trackPointer(event: PointerEvent) {
      let position = _pointerPositions[event.pointerId];

      if (position === undefined) {
        position = new Vector2();
        _pointerPositions[event.pointerId] = position;
      }

      position.set(event.pageX, event.pageY);
    }

    function getSecondPointerPosition(event: PointerEvent) {
      const pointer =
        event.pointerId === _pointers[0].pointerId
          ? _pointers[1]
          : _pointers[0];

      return _pointerPositions[pointer.pointerId];
    }

    scope.dispose = function () {
      scope.domElement.removeEventListener('contextmenu', contextmenu);

      scope.domElement.removeEventListener('pointerdown', onPointerDown);
      scope.domElement.removeEventListener('pointercancel', onPointerCancel);
      scope.domElement.removeEventListener('wheel', onMouseWheel);

      scope.domElement.removeEventListener('pointermove', onPointerMove);
      scope.domElement.removeEventListener('pointerup', onPointerUp);

      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
    };

    scope.domElement.addEventListener('contextmenu', contextmenu);

    scope.domElement.addEventListener('pointerdown', onPointerDown);
    scope.domElement.addEventListener('pointercancel', onPointerCancel);
    scope.domElement.addEventListener('wheel', onMouseWheel, {
      passive: false,
    });

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    scope.handleResize();

    // force an update at start
    scope.update();
  }
}
