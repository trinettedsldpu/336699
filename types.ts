export enum AppMode {
  TREE = 'TREE',
  SCATTER = 'SCATTER',
  FOCUS = 'FOCUS'
}

export interface ParticleState {
  mode: AppMode;
  rotation: { x: number; y: number };
  targetRotation: { x: number; y: number };
  isMobile: boolean;
}

export interface VisionResult {
  pinchDist: number;
  palmOpenness: number;
  landmarks: any[];
}