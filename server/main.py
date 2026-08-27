import os
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
import yt_dlp
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Local Video Hub API")

# プロジェクト直下のパスを取得
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# ダウンロード先のフォルダ
INBOX_DIR = os.path.join(BASE_DIR, "downloads", "inbox")
os.makedirs(INBOX_DIR, exist_ok=True)

# クッキーとffmpegのパス
COOKIE_FILE = os.path.join(BASE_DIR, "config", "x.com_cookies.txt")
BIN_DIR = os.path.join(BASE_DIR, "bin")

# 環境変数からAPIキーを取得
SECRET_API_KEY = os.getenv("API_KEY")

class VideoRequest(BaseModel):
    url: str
    api_key: str

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
    # APIキーの検証 (未設定、または不一致の場合は401エラー)
    if not SECRET_API_KEY or request.api_key != SECRET_API_KEY:
        raise HTTPException(status_code=401, detail="APIキーが間違っています")

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