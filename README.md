# Local Video Hub

ローカルの動画ファイルを管理・閲覧し、AIによる自動タグ付けを行うための統合ツールセットです。動画ギャラリーを閲覧するWebクライアント（Client）、自動ダウンロードを行うバックエンドAPI（Server）、動画にタグを付与するAIスクリプト（Tagger）で構成されています。

## 特徴 (Features)

- **バックエンドAPI (`server/`)**
  - FastAPIと `yt-dlp` を用いたバックグラウンド動画ダウンロード機能。
  - iOSショートカットと連携し、スマホ（Xなど）からワンタップでPCへ動画を保存可能。
  - APIキー認証によるセキュアなローカルネットワーク公開。
- **Webクライアント (`client/`)**
  - React + Vite 構成の高速なフロントエンド。
  - Tailwind CSS を用いたモダンなUI、PWA (Progressive Web App) 対応。
- **AI動画タガー (`tagger/`)**
  - 動画 (`.mp4`) から自動的に複数フレームを抽出し、画像認識AIによってタグを生成。
  - JellyfinやKodiで読み込み可能な `.nfo` ファイルにタグ情報を自動追記。

---

## ディレクトリ構成

- `client/` : ビデオギャラリーを表示するためのReact/Viteアプリケーション。
- `server/` : 動画ダウンロードリクエストを受け付けるFastAPIバックエンド。
- `tagger/` : 動画からタグを抽出し、`.nfo` ファイルを編集するPythonスクリプト。
- `bin/` : 外部バイナリファイル（`ffmpeg.exe` 等）の配置場所。
- `config/` : 設定ファイル（`x.com_cookies.txt` 等）の配置場所。
- `downloads/inbox/` : ダウンロードされた動画の初期保存先。
- `start_local-video-hub.vbs` : フロントエンドとバックエンドを同時にバックグラウンド起動するスクリプト。

---

## セットアップ

### 1. 全体設定とバックエンド (`server/`)

#### 必要な環境・ファイル
- Python 3.10以上
- `ffmpeg.exe` (動画と音声の結合に使用。`bin/` ディレクトリ内に配置してください)
- `x.com_cookies.txt` (Xの動画保存用。`config/` ディレクトリ内に配置してください)

#### インストールと環境設定
1. プロジェクトルートに `.env` ファイルを作成し、APIキーを設定します。
   ```text
   API_KEY=your_secret_key_here
   ```
2. Pythonの依存関係をインストールします。（tagger のライブラリも含む）
   ```bash
   pip install fastapi uvicorn pydantic yt-dlp python-dotenv opencv-python numpy pandas huggingface-hub onnxruntime
   ```

### 2. Web Client (`client/`)

#### 必要な環境
- Node.js (v18 以上推奨)

#### インストールとビルド
```bash
cd client
npm install
npm run build
```

---

## 使い方 (Usage)

### 1. システムの起動
プロジェクトルートにある `start_local-video-hub.vbs` をダブルクリックします。
バックグラウンドで自動的に以下の2つが起動します。
- Webクライアント (ポート: 3096)
- ダウンロードAPI (ポート: 9096)

### 2. AI Video Tagger によるタグ付け
対象の動画ファイル単体、または動画が含まれるディレクトリのパスを指定して実行します。
```bash
# ファイル単体の処理
python tagger/tagger.py "C:\path\to\your\video.mp4"

# ディレクトリ全体の一括処理
python tagger/tagger.py "C:\path\to\your\videos_folder"
```

### 3. iOSからのワンタップ保存（ショートカット）
iPhoneからPC（API）へURLを送信し、自動ダウンロードを開始できます。

1. **ショートカットの追加:**
   [https://www.icloud.com/shortcuts/c4c03d26125f4a9eba98c6f6e50f8498] をタップしてショートカットを取得します。

2. **初期設定:**
   ショートカット内の設定で、以下の2箇所をご自身の環境に合わせて書き換えてください。
   - URL: `http://<PCのローカルIPまたはTailscale IP>:9096/download`
   - api_key: `.env` に設定したAPIキーの文字列

3. **実行:**
   X等のアプリで共有ボタンを押し、「PCへ保存（ショートカット名）」をタップするだけで、バックグラウンドで `downloads/inbox/` に動画が保存されます。

---

## 注意事項
- Taggerスクリプトは初回実行時に Hugging Face からAIモデルを自動ダウンロードします。
- セキュリティのため、`.env`, `config/`, `bin/` などの機密情報や巨大バイナリはGitの管理から除外（`.gitignore`）されています。
