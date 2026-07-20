import os
import pandas as pd
from huggingface_hub import hf_hub_download

class TagDownloader:
    def __init__(self, model_name="wd-v1-4-moat-tagger-v2"):
        self.model_name = model_name

    def download_and_save(self, output_path):
        print(f"=== [{self.model_name}] タグリストをダウンロード中 ===")
        
        # WD14のタグリスト取得
        repo_id = f"SmilingWolf/{self.model_name}"
        csv_path = hf_hub_download(repo_id, "selected_tags.csv")
        df = pd.read_csv(csv_path)
        
        # タグ名を取得
        self.tags = df["name"].tolist()
        print(f"タグ数: {len(self.tags)} 個")

        # 出力先ディレクトリの確保
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        # CSVとして保存（Excel等でフィルタリングして見やすくするため）
        df.to_csv(output_path, index=False)
        print(f"タグ一覧を保存しました: {output_path}")

if __name__ == "__main__":
    # 出力先を data/all_tags.csv に設定
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    OUTPUT_PATH = os.path.abspath(os.path.join(SCRIPT_DIR, "data", "all_tags.csv"))
    
    td = TagDownloader()
    td.download_and_save(OUTPUT_PATH)