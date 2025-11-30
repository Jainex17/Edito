from fastapi import FastAPI, UploadFile, File, Form
import uuid
import os
import json
import shutil
import asyncio
from fastapi.responses import FileResponse, JSONResponse
from typing import List
from process_vid import process_job

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
async def upload_video(
    video: UploadFile = File(...), 
    overlays: str = Form(...),
    assets: List[UploadFile] = File(None),
    container_width: float = Form(...),
    container_height: float = Form(...)
):
    job_id = str(uuid.uuid4())
    data = json.loads(overlays)

    job_dir = os.path.join(UPLOAD_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    video_path = os.path.join(job_dir, "input.mp4")
    save_uploaded_file(video, video_path)

    if assets:
        for asset in assets:
            asset_path = os.path.join(job_dir, asset.filename)
            save_uploaded_file(asset, asset_path)

    with open(os.path.join(job_dir, "overlays.json"), "w") as f:
        json.dump(data, f)

    JOBS[job_id] = {"status": "queued", "progress": 0, "out_path": None}

    asyncio.create_task(process_job(job_id, video_path, data, job_dir, container_width, container_height, JOBS, RESULT_DIR))

    return {"job_id": job_id, "status": "processing", "message": "Video upload successful"}

@app.get("/status/{job_id}")
def status(job_id: str):
    if job_id not in JOBS:
        return JSONResponse({"error": "Job not found"}, status_code=404)
    
    return JOBS[job_id]

@app.get("/result/{job_id}")
def result(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return JSONResponse({"error":"Job not found"}, status_code=404)

    if job["status"] != "done":
        return JSONResponse({"error":"Video not ready", "status": job["status"]}, status_code=400)

    return FileResponse(
        job["out_path"], 
        media_type="video/mp4", 
        filename=f"output_{job_id}.mp4",
        headers={"Content-Disposition": f"attachment; filename=output_{job_id}.mp4"}
    )