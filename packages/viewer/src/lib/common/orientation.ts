import { Vector3 } from 'three';

export interface OrientationDefinition {
  name: 'axial' | 'sagittal' | 'coronal';
  up: Vector3;
  rotation: number;
}

interface IOrientation {
  AXIAL: OrientationDefinition;
  SAGITTAL: OrientationDefinition;
  CORONAL: OrientationDefinition;
}

export const Orientation: IOrientation = {
  AXIAL: {
    name: 'axial',
    up: new Vector3(0, -1, 0),
    rotation: Math.PI * 0.5,
  },
  SAGITTAL: {
    name: 'sagittal',
    up: new Vector3(0, 0, 1),
    rotation: Math.PI * 0.5,
  },
  CORONAL: {
    name: 'coronal',
    up: new Vector3(0, 0, 1),
    rotation: Math.PI * 0.5,
  },
};
