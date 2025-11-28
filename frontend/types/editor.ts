export interface Overlay {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  startTime: number;
  endTime: number;
}

export const TIMELINE_SCALE = 30;
export const THUMBNAIL_INTERVAL = 2;
