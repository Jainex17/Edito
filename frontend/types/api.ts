export interface VideoExportRequest {
  sourceVideo: {
    videoId: string;
    url: string;
    duration: number;
  };
  overlays: Overlay[];
  exportSettings: ExportSettings;
  metadata?: VideoMetadata;
}

export interface ExportSettings {
  quality: 'low' | 'medium' | 'high' | 'original';
  format: 'mp4' | 'mov' | 'webm';
  resolution?: {
    width: number;
    height: number;
  };
  fps?: number;
  bitrate?: number;
}

export interface VideoMetadata {
  title?: string;
  description?: string;
  tags?: string[];
}

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
  style?: TextOverlayStyle;
  animation?: OverlayAnimation;
}

export interface TextOverlayStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  opacity?: number;
  borderColor?: string;
  borderWidth?: number;
  shadowColor?: string;
  shadowOffset?: { x: number; y: number };
  shadowBlur?: number;
}

export interface OverlayAnimation {
  type: 'fade' | 'slide' | 'zoom' | 'bounce' | 'none';
  duration?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  direction?: 'in' | 'out' | 'both';
}

export const TIMELINE_SCALE = 30;
export const THUMBNAIL_INTERVAL = 2;
