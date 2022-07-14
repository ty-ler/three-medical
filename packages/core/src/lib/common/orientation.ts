// import { Vector3 } from 'three';

// export interface OrientationDefinition {
//   name: 'axial' | 'sagittal' | 'coronal';
// }

// interface IOrientation {
//   AXIAL: OrientationDefinition;
//   SAGITTAL: OrientationDefinition;
//   CORONAL: OrientationDefinition;
// }

// export const Orientation: IOrientation = {
//   AXIAL: {
//     name: 'axial',
//   },
//   SAGITTAL: {
//     name: 'sagittal',
//   },
//   CORONAL: {
//     name: 'coronal',
//   },
// };

export enum Orientation {
  AXIAL = 'AXIAL',
  SAGITTAL = 'SAGITTAL',
  CORONAL = 'CORONAL',
}

export const getOrientationIndex = (orientation: Orientation) => {
  switch (orientation) {
    case Orientation.AXIAL:
      return 2;
    case Orientation.SAGITTAL:
      return 0;
    case Orientation.CORONAL:
      return 1;
  }
};
