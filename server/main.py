import os
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
import yt_dlp

app = FastAPI(title="Local Video Hub API")

# プロジェクト直下のパスを取得
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# ダウンロード先のフォルダ
INBOX_DIR = os.path.join(BASE_DIR, "downloads", "inbox")
os.makedirs(INBOX_DIR, exist_ok=True)

# クッキーとffmpegのパス
COOKIE_FILE = os.path.join(BASE_DIR, "config", "x.com_cookies.txt")
BIN_DIR = os.path.join(BASE_DIR, "bin")

class VideoRequest(BaseModel):
    url: str

def download_with_ytdlp(url: str):
    print(f"\n[{url}] ダウンロードを開始します...")
    
    # オプションを設定
    ydl_opts = {
        # 出力ファイル名: IDのみ
        'outtmpl': os.path.join(INBOX_DIR, '%(id)s.%(ext)s'),
        
        # フォーマット指定とmp4マージ
        'format': 'bv+ba/b',
        'merge_output_format': 'mp4',
        
        # FFmpegでの音声AACエンコード
        'postprocessor_args': ['-c:a', 'aac'],
        
        # クッキーファイルの指定
        'cookiefile': COOKIE_FILE,
        'ffmpeg_location': BIN_DIR,

        'noplaylist': True,
        'ignoreerrors': True,
        'quiet': False,
    }
    
    # クッキーファイルが存在しない場合の警告
    if not os.path.exists(COOKIE_FILE):
        print(f"[警告] クッキーファイルが見つかりません: {COOKIE_FILE}")
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        print(f"[{url}] ダウンロードが完了しました！\n")
    except Exception as e:
        print(f"[{url}] エラーが発生しました: {e}\n")

@app.post("/download")
async def download_video(request: VideoRequest, background_tasks: BackgroundTasks):
    print(f"URLを受け取りました: {request.url}")
    
    # ダウンロード処理をバックグラウンドタスクとして登録
    background_tasks.add_task(download_with_ytdlp, request.url)
    
    # クライアントには即座に返事をする
    return {
        "status": "success", 
        "message": "ダウンロードをバックグラウンドで開始しました", 
        "url": request.url,
        "save_dir": INBOX_DIR
    }