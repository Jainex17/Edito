from fastapi import FastAPI, UploadFile, File, Form
import uuid
import os
import json
import shutil
import asyncio
import subprocess
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI()

UPLOAD_DIR = "uploads"
RESULT_DIR = "results"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

JOBS = {}

def save_uploaded_file(upload_file: UploadFile, dest_path: str):
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)

@app.post("/upload")
async def upload_video(video:UploadFile = File(...), metadata: str = Form(...)):
    
    job_id = str(uuid.uuid4())
    data = json.loads(metadata)

    job_dir = os.path.join(UPLOAD_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    video_path = os.path.join(job_dir, "input.mp4")
    save_uploaded_file(video, video_path)

    with open(os.path.join(job_dir, "metadata.json"), "w") as f:
        json.dump(data, f)

    JOBS[job_id] = {"status": "queued", "progress": 0, "out_path": None}

    asyncio.create_task(process_job(job_id, video_path, data, job_dir))

    return {"job_id": job_id}

@app.get("/status/{job_id}")
def status(job_id: str):
    if job_id not in JOBS:
        return JSONResponse({"error": "not found"}, status_code=404)
    
    return JOBS[job_id]

@app.get("/result/{job_id}")
def result(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return JSONResponse({"error":"not found"}, status_code=404)

    if job["status"] != "done":
        return JSONResponse({"error":"not ready"}, status_code=400)

    return FileResponse(job["out_path"], media_type="video/mp4", filename=os.path.basename(job["out_path"]))

def probe_video(path):
    cmd = ["ffprobe", "-v", "error", "-select_streams", "v:0",
           "-show_entries", "stream=width,height", "-show_entries", "format=duration",
           "-of", "json", path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(res.stdout)

async def process_job(job_id, video_path, metadata, job_dir):
    JOBS[job_id]["status"] = "processing"

    try:
        probe = probe_video(video_path)
        duration = float(probe["format"]["duration"])
        width = int(probe["streams"][0]["width"])
        height = int(probe["streams"][0]["height"])
        
        print(f"Video duration: {duration}, width: {width}, height: {height}")

        # real magic :)
    
    except Exception as e:
        JOBS[job_id]["status"] = "error"
        print(f"Error processing job {job_id}: {e}")
        return