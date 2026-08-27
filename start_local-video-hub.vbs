Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' スクリプトが置かれているプロジェクトのフォルダパスを取得してカレントディレクトリに設定
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = currentDir

' フロントエンド (React) の起動
' clientフォルダに移動してから npm run preview を非表示(0)で実行
ws.Run "cmd /c cd client && npm run preview", 0, False

' バックエンド (FastAPI) の起動
' 仮想環境を有効化して、uvicorn を非表示(0)で実行
' 外部(スマホ)からアクセスできるように host と port も指定
ws.Run "cmd /c "".venv\Scripts\activate && uvicorn server.main:app --host 0.0.0.0 --port 9096""", 0, False