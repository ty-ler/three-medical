export enum ControlMethod {
  Primary = 'Primary',
  Secondary = 'Secondary',
  Wheel = 'Wheel',
}

export interface ControlConfig {
  methods: ControlMethod[];
  preventDefault?: boolean;
  stopPropagation?: boolean;
}
