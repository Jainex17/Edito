import os
import shutil
import subprocess
import json
import asyncio

async def process_job(job_id, video_path, overlays, job_dir, container_width, container_height, jobs, result_dir):
    jobs[job_id]["status"] = "processing"
    jobs[job_id]["progress"] = 10
    jobs[job_id]["message"] = "Starting processing..."

    try:
        probe = probe_video(video_path)
        duration = float(probe["format"]["duration"])
        width = int(probe["streams"][0]["width"])
        height = int(probe["streams"][0]["height"])
        
        video_aspect = width / height
        container_aspect = container_width / container_height
        
        if container_aspect > video_aspect:
            display_height = container_height
            display_width = container_height * video_aspect
            offset_x = (container_width - display_width) / 2
            offset_y = 0
            scale_factor = width / display_width
        else:
            display_width = container_width
            display_height = container_width / video_aspect
            offset_x = 0
            offset_y = (container_height - display_height) / 2
            scale_factor = width / display_width
        
        jobs[job_id]["progress"] = 30
        jobs[job_id]["message"] = "Building filters..."
        
        output_path = os.path.join(result_dir, f"{job_id}.mp4")
        
        text_overlays = [item for item in overlays if item.get("type") == "text"]
        image_overlays = [item for item in overlays if item.get("type") == "image"]
        video_overlays = [item for item in overlays if item.get("type") == "video"]
        
        if not text_overlays and not image_overlays and not video_overlays:
            shutil.copy(video_path, output_path)
            jobs[job_id]["progress"] = 90
        else:
            inputs = ["-i", video_path]
            filter_complex = []
            current_stream = "[0:v]"
            input_index = 1

            # Process image overlays
            for overlay in image_overlays:
                filename = overlay.get("content")
                # Extract just the filename from file:// URIs or paths
                if filename.startswith("file://"):
                    filename = os.path.basename(filename)
                img_path = os.path.join(job_dir, filename)
                
                if not os.path.exists(img_path):
                    print(f"Warning: Image asset not found: {img_path}")
                    continue
                    
                inputs.extend(["-i", img_path])
                
                start_time = overlay.get("start_time", 0)
                end_time = overlay.get("end_time", duration)
                
                x_container = overlay.get("x", 0)
                y_container = overlay.get("y", 0)
                w_container = overlay.get("width", 100)
                h_container = overlay.get("height", 100)
                
                x = int((x_container - offset_x) * scale_factor)
                y = int((y_container - offset_y) * scale_factor)
                w = int(w_container * overlay.get("scale", 1.0) * scale_factor)
                h = int(h_container * overlay.get("scale", 1.0) * scale_factor)
                
                scaled_stream = f"[img{input_index}]"
                filter_complex.append(f"[{input_index}:v]scale={w}:{h}{scaled_stream}")
                
                next_stream = f"[v_img{input_index}]"
                filter_complex.append(
                    f"{current_stream}{scaled_stream}overlay=x={x}:y={y}:"
                    f"enable='between(t,{start_time},{end_time})'{next_stream}"
                )
                
                current_stream = next_stream
                input_index += 1

            # Process video overlays
            for overlay in video_overlays:
                filename = overlay.get("content")
                # Extract just the filename from file:// URIs or paths
                if filename.startswith("file://"):
                    filename = os.path.basename(filename)
                vid_path = os.path.join(job_dir, filename)
                
                if not os.path.exists(vid_path):
                    print(f"Warning: Video asset not found: {vid_path}")
                    continue
                
                inputs.extend(["-i", vid_path])
                
                start_time = overlay.get("start_time", 0)
                end_time = overlay.get("end_time", duration)
                
                x_container = overlay.get("x", 0)
                y_container = overlay.get("y", 0)
                w_container = overlay.get("width", 100)
                h_container = overlay.get("height", 100)
                
                x = int((x_container - offset_x) * scale_factor)
                y = int((y_container - offset_y) * scale_factor)
                w = int(w_container * overlay.get("scale", 1.0) * scale_factor)
                h = int(h_container * overlay.get("scale", 1.0) * scale_factor)
                
                # Scale and trim video overlay with setpts to sync timing
                scaled_stream = f"[vid{input_index}]"
                filter_complex.append(
                    f"[{input_index}:v]scale={w}:{h},setpts=PTS-STARTPTS+{start_time}*TB{scaled_stream}"
                )
                
                next_stream = f"[v_vid{input_index}]"
                filter_complex.append(
                    f"{current_stream}{scaled_stream}overlay=x={x}:y={y}:"
                    f"enable='between(t,{start_time},{end_time})'{next_stream}"
                )
                
                current_stream = next_stream
                input_index += 1

            # Process text overlays
            if text_overlays:
                drawtexts = []
                for overlay in text_overlays:
                    text = overlay.get("content", "").replace("'", "'\\''")
                    
                    start_time = overlay.get("start_time", 0)
                    end_time = overlay.get("end_time", duration)
                    
                    x_container = overlay.get("x", 0)
                    y_container = overlay.get("y", 0)
                    
                    x = int((x_container - offset_x + 10) * scale_factor)
                    y = int((y_container - offset_y + 10) * scale_factor)
                    
                    style = overlay.get("style", {})
                    font_size = int(style.get("fontSize", 35) * scale_factor)
                    
                    drawtext = (
                        f"drawtext=text='{text}':"
                        f"x={x}:y={y}:"
                        f"fontsize={font_size}:"
                        f"fontcolor=white:"
                        f"enable='between(t,{start_time},{end_time})'"
                    )
                    drawtexts.append(drawtext)
                
                filter_complex.append(f"{current_stream}{','.join(drawtexts)}[out]")
                current_stream = "[out]"
            
            # Only run ffmpeg with filter if we have valid overlays
            if filter_complex and len(inputs) > 2:
                cmd = ["ffmpeg"] + inputs + ["-filter_complex", ";".join(filter_complex), "-map", current_stream, "-map", "0:a?", "-c:v", "libx264", "-c:a", "aac", "-y", output_path]
            else:
                shutil.copy(video_path, output_path)
                jobs[job_id]["progress"] = 90
                jobs[job_id]["status"] = "done"
                jobs[job_id]["progress"] = 100
                jobs[job_id]["out_path"] = output_path
                jobs[job_id]["message"] = "Video processing completed"
                jobs[job_id]["output_url"] = f"/result/{job_id}"
                print(f"No valid overlays found, copied original video")
                return
            
            loop = asyncio.get_event_loop()
            process_result = await loop.run_in_executor(
                None,
                lambda: subprocess.run(cmd, capture_output=True, text=False)
            )
            
            if process_result.returncode != 0:
                error_msg = process_result.stderr.decode('utf-8', errors='ignore')
                print(f"FFmpeg error: {error_msg}")
                jobs[job_id]["status"] = "failed"
                jobs[job_id]["error"] = f"FFmpeg error: {error_msg[:200]}"
                jobs[job_id]["message"] = "Processing failed"
                return
        
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["out_path"] = output_path
        jobs[job_id]["message"] = "Video processing completed"
        jobs[job_id]["output_url"] = f"/result/{job_id}"
        print(f"Video processing completed for job {job_id}")
    
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["message"] = f"Error: {str(e)}"
        print(f"Error processing job {job_id}: {str(e)}")
        return

def probe_video(path):
    cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0",
           "-show_entries", "stream=width,height", "-show_entries", "format=duration",
           "-of", "json", path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(res.stdout)