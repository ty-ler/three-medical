import { PlaneGeometry } from 'three';
import { Volume as THREEVolume } from 'three/examples/jsm/misc/Volume';
import { VolumeSlice } from './VolumeSlice';

export class Volume extends THREEVolume {
  public RASDimensions: number[];
  public geometry: PlaneGeometry;

  public extractSlice(axis: string, index: number): VolumeSlice {
    return super.extractSlice(axis, index) as VolumeSlice;
  }
}
