Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' スクリプトが置かれているプロジェクトのフォルダパスを取得してカレントディレクトリに設定
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = currentDir

' npm run preview を非表示(0)で実行
ws.Run "cmd /c npm run preview", 0, False