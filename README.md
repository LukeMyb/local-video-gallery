# Local Video Gallery

ローカルの動画ファイルを管理・閲覧し、AIによる自動タグ付けを行うための統合ツールセットです。動画に自動でタグを付与するPythonスクリプト（Tagger）と、動画ギャラリーを閲覧するためのモダンなWebクライアント（Client）で構成されています。

## 特徴 (Features)

- **AI動画タガー (`tagger/`)**
  - 動画 (`.mp4`) から自動的に複数フレームを抽出し、画像認識AIによってタグを生成。
  - Hugging Faceの `SmilingWolf/wd-v1-4-convnext-tagger-v2` および `wd-v1-4-moat-tagger-v2` を利用した高精度なタグ推論。
  - JellyfinやKodiなどのメディアサーバーで読み込み可能な `.nfo` ファイルにタグ情報を自動追記（既存ファイルのバックアップ機能付き）。
- **Webクライアント (`client/`)**
  - React + Vite 構成の高速なフロントエンド。
  - Tailwind CSS を用いたモダンなUI。
  - PWA (Progressive Web App) 対応。

---

## ディレクトリ構成

- `tagger/` : 動画からタグを抽出し、`.nfo` ファイルを編集するPythonスクリプト。
- `client/` : ビデオギャラリーを表示するためのReact/Viteアプリケーション。

---

## セットアップと使い方

### 1. AI Video Tagger (`tagger/`)

#### 必要な環境
- Python 3.8以上

#### インストール
`tagger` ディレクトリに移動し、必要なライブラリをインストールします。
```bash
cd tagger
pip install opencv-python numpy pandas huggingface-hub onnxruntime
```
*(※ CPU版のonnxruntimeを想定していますが、GPUを利用する場合は `onnxruntime-gpu` またはDirectML版をインストールしてください。)*

#### 実行方法
対象の動画ファイル単体、または動画が含まれるディレクトリのパスを指定して実行します。ディレクトリを指定した場合は、中の `.mp4` ファイルを再帰的に検索して処理します。

```bash
# ファイル単体の処理
python tagger.py "C:\path\to\your\video.mp4"

# ディレクトリ全体の一括処理
python tagger.py "C:\path\to\your\videos_folder"
```

### 2. Web Client (`client/`)

#### 必要な環境
- Node.js (v18 以上推奨)

#### インストール
```bash
cd client
npm install
```

#### 開発サーバーの起動
```bash
npm run dev
```

プロダクション用にビルドし、プレビューモード（ポート3096）で起動するには以下を実行します。
```bash
npm run build
npm run preview
```

---

## 注意事項

- Taggerスクリプトは初回実行時に Hugging Face から数百MBのAIモデル（onnx形式）を自動ダウンロードします。インターネット接続が必要です。
- AIモデルはアニメやイラスト等の画像（Danbooruタグ）に特化したモデルを利用しています。
