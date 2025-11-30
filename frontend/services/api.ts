const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export interface OverlayMetadata {
  id: string;
  type: 'text' | 'image' | 'video';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  start_time: number;
  end_time: number;
  style?: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
    opacity?: number;
  };
}

export interface UploadResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface StatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'done';
  progress: number;
  message: string;
  output_url?: string;
  error?: string;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  message?: string;
}

export async function uploadVideoWithOverlays(
  videoUri: string,
  overlays: any[],
  containerWidth: number,
  containerHeight: number
): Promise<UploadResponse> {
  try {
    const formData = new FormData();

    // Add video file
    const filename = videoUri.split('/').pop() || 'video.mp4';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `video/${match[1]}` : 'video/mp4';

    formData.append('video', {
      uri: videoUri,
      name: filename,
      type,
    } as any);
    
    formData.append('container_width', containerWidth.toString());
    formData.append('container_height', containerHeight.toString());

    const overlaysMetadata: OverlayMetadata[] = [];
    
    for (let i = 0; i < overlays.length; i++) {
      const overlay = overlays[i];
      let content = overlay.content;

      if (overlay.type === 'image') {
        const assetFilename = `asset_${i}_${Date.now()}.jpg`;
        formData.append('assets', {
          uri: overlay.content,
          name: assetFilename,
          type: 'image/jpeg',
        } as any);
        content = assetFilename;
      }

      overlaysMetadata.push({
        id: overlay.id,
        type: overlay.type,
        content: content,
        x: overlay.x,
        y: overlay.y,
        width: overlay.width,
        height: overlay.height,
        scale: overlay.scale,
        rotation: overlay.rotation,
        start_time: overlay.startTime,
        end_time: overlay.endTime,
        style: overlay.style,
      });
    }

    formData.append('overlays', JSON.stringify(overlaysMetadata));

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data: UploadResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
}

export async function checkStatus(jobId: string): Promise<StatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/status/${jobId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json();
      throw new Error(errorData.error || 'Failed to check status');
    }

    const data: StatusResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking status:', error);
    throw error;
  }
}

export function getResultUrl(jobId: string): string {
  return `${API_BASE_URL}/result/${jobId}`;
}

export async function pollUntilComplete(
  jobId: string,
  onProgress?: (status: StatusResponse) => void,
  pollInterval: number = 2000
): Promise<StatusResponse> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const statusData = await checkStatus(jobId);

        if (onProgress) {
          onProgress(statusData);
        }
        if (statusData.status === 'completed' || statusData.status === 'done') {
          resolve(statusData);
          return;
        }

        if (statusData.status === 'failed') {
          reject(new Error(statusData.error || 'Processing failed'));
          return;
        }

        setTimeout(poll, pollInterval);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}

export async function exportVideo(
  videoUri: string,
  overlays: any[],
  containerWidth: number,
  containerHeight: number,
  onProgress?: (stage: string, progress: number, message: string) => void
): Promise<StatusResponse> {
  try {
    onProgress?.('Uploading', 10, 'Uploading video and overlays...');
    const uploadResponse = await uploadVideoWithOverlays(videoUri, overlays, containerWidth, containerHeight);

    onProgress?.('Processing', 30, 'Video is being processed...');

    const finalStatus = await pollUntilComplete(
      uploadResponse.job_id,
      (status) => {
        const mappedProgress = 30 + (status.progress || 0) * 0.7;
        onProgress?.(status.status, mappedProgress, status.message);
      }
    );

    return finalStatus;
  } catch (error) {
    console.error('Export workflow error:', error);
    throw error;
  }
}
