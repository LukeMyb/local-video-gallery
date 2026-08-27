from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Local Video Hub API")

class VideoRequest(BaseModel):
    url: str

@app.post("/download")
async def download_video(request: VideoRequest):
    print(f"URLを受け取りました: {request.url}")
    return {"status": "success", "message": "URL received", "url": request.url}