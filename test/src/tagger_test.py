import os
import cv2
import numpy as np
import pandas as pd
import gc
from huggingface_hub import hf_hub_download
import onnxruntime as ort
import xml.etree.ElementTree as ET # NFO(XML)出力用
import glob

class VideoTaggerTest:
    def __init__(self, 
                 conv_model_name="wd-v1-4-convnext-tagger-v2", 
                 moat_model_name="wd-v1-4-moat-tagger-v2",     
                 general_threshold=0.35, 
                 character_threshold=0.75): 
        
        self.general_threshold = general_threshold
        self.character_threshold = character_threshold
        self.conv_model_name = conv_model_name
        self.moat_model_name = moat_model_name
        
        self.ignore_tags = {
            "explicit", "questionable", "safe", "sensitive", "general",
            "rating:explicit", "rating:questionable", "rating:safe", 
            "rating:sensitive", "rating:general",
            "text", "signature", "watermark", "username", "artist name", 
            "date", "translated", "copyright name", "source", "commentary request",
            "simple background", "white background", "transparent background",
            "black background", "grey background", "gradient background",
            "pattern background", "abstract background", 
            "indoors", "outdoors",
            "blue_skin", "purple_skin", "green_skin", "red_skin", "grey_skin"
        }

    def _load_model(self, model_name):
        print(f"[{model_name}] をVRAMにロード中...")
        repo_id = f"SmilingWolf/{model_name}"

        model_path = hf_hub_download(repo_id, "model.onnx")
        csv_path = hf_hub_download(repo_id, "selected_tags.csv")

        self.tags_df = pd.read_csv(csv_path)
        self.tag_names = self.tags_df["name"].tolist()
        self.tag_categories = self.tags_df["category"].tolist()
        
        self.session = ort.InferenceSession(model_path, providers=['DmlExecutionProvider', 'CPUExecutionProvider'])
        self.input_name = self.session.get_inputs()[0].name

    def _unload_model(self):
        self.session = None
        gc.collect()
        print("VRAMからモデルを解放しました。")

    # OpenCVで読み込んだ画像(numpy配列)を直接受け取る
    def preprocess_image(self, img):
        if img is None: return None
        
        size = 448
        h, w, _ = img.shape
        max_dim = max(h, w)
        pad_img = np.zeros((max_dim, max_dim, 3), dtype=np.uint8) + 255
        
        offset_w = (max_dim - w) // 2
        offset_h = (max_dim - h) // 2
        pad_img[offset_h:offset_h+h, offset_w:offset_w+w] = img
        
        img = cv2.resize(pad_img, (size, size), interpolation=cv2.INTER_CUBIC)
        img = img.astype(np.float32)
        img = np.expand_dims(img, 0)
        return img

    # 動画から等間隔で複数枚のフレームを抽出する
    def extract_frames(self, video_path, num_frames=5):
        print(f"動画からフレームを抽出中({num_frames}枚): {video_path}")
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frames = []
        
        # 動画を (num_frames + 1) 分割し、均等な間隔で抽出
        for i in range(1, num_frames + 1):
            target_frame = int(total_frames * (i / (num_frames + 1)))
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            ret, frame = cap.read()
            if ret:
                frames.append(frame)
                
        cap.release()
        return frames if frames else None

    # 抽出したタグからJellyfin互換のNFOファイルを生成する
    def generate_nfo(self, video_path, output_dir, tags):
        import os
        import shutil
        import xml.etree.ElementTree as ET

        base_name = os.path.basename(video_path)
        file_name_without_ext = os.path.splitext(base_name)[0]
        
        original_nfo_path = os.path.splitext(video_path)[0] + ".nfo"
        target_nfo_path = os.path.join(output_dir, file_name_without_ext + ".nfo")

        # オリジナルNFOが存在する場合はoutputフォルダにコピー（退避）
        if os.path.exists(original_nfo_path):
            shutil.copy2(original_nfo_path, target_nfo_path)
            print(f"\n元のNFOファイルを退避先へコピーしました: {target_nfo_path}")
        
        # 退避先ファイルの読み込み、または新規作成
        if os.path.exists(target_nfo_path):
            print(f"退避先のNFOファイルを更新します: {target_nfo_path}")
            try:
                tree = ET.parse(target_nfo_path)
                root = tree.getroot()
            except ET.ParseError:
                print("NFOファイルの解析に失敗しました。新規作成します。")
                root = ET.Element("movie")
                tree = ET.ElementTree(root)
        else:
            print(f"\nNFOファイルを新規作成します: {target_nfo_path}")
            root = ET.Element("movie")
            tree = ET.ElementTree(root)

        # 既存タグのリストアップ（重複追加を防止）
        existing_tags = set()
        for tag_elem in root.findall("tag"):
            if tag_elem.text:
                existing_tags.add(tag_elem.text)

        # 新規タグの追加
        added_count = 0
        for tag in tags:
            if tag not in existing_tags:
                tag_elem = ET.SubElement(root, "tag")
                tag_elem.text = tag
                added_count += 1

        # 保存
        tree.write(target_nfo_path, encoding="utf-8", xml_declaration=True)
        print(f"NFOファイルに {added_count} 個の新しいタグを追加保存しました。")

    def save_tags_txt(self, output_dir, tags):
        target_txt_path = os.path.join(output_dir, "tags.txt")
        
        with open(target_txt_path, "w", encoding="utf-8") as f:
            f.write(", ".join(tags))
        
        print(f"最終的な検出タグを保存しました: {target_txt_path}\n")

    def test_single_video(self, video_path, output_base_dir, num_frames=5, min_hits=1):
        print(f"=== 動画タグ付け処理開始: {os.path.basename(video_path)} ===")
        
        # 出力先ディレクトリの作成
        video_name = os.path.splitext(os.path.basename(video_path))[0]
        output_dir = os.path.join(output_base_dir, video_name)
        os.makedirs(output_dir, exist_ok=True)
        
        frames = self.extract_frames(video_path, num_frames=num_frames)
        if not frames:
            print("動画の読み込み、またはフレームの抽出に失敗しました。")
            return

        # フレーム画像の保存
        for i, frame in enumerate(frames):
            frame_path = os.path.join(output_dir, f"frame{i+1}.png")
            cv2.imwrite(frame_path, frame)
            print(f"フレーム画像を保存しました: {frame_path}")

        input_tensors = [self.preprocess_image(f) for f in frames]

        # 第1パス: ConvNeXt
        self._load_model(self.conv_model_name)
        conv_probs_list = []
        for tensor in input_tensors:
            conv_probs_list.append(self.session.run(None, {self.input_name: tensor})[0][0])
        self._unload_model()

        # 第2パス: MOAT
        self._load_model(self.moat_model_name)
        moat_probs_list = []
        for tensor in input_tensors:
            moat_probs_list.append(self.session.run(None, {self.input_name: tensor})[0][0])
        self._unload_model()

        # タグの集計とフレームごとのTXT出力
        tag_counts = {}
        for i in range(num_frames):
            frame_tags = []
            for tag_idx in range(len(self.tag_names)):
                tag_name = self.tag_names[tag_idx]
                if tag_name in self.ignore_tags: continue

                c_prob = float(conv_probs_list[i][tag_idx])
                m_prob = float(moat_probs_list[i][tag_idx])
                combined_prob = max(c_prob, m_prob)

                category = self.tag_categories[tag_idx]
                threshold = self.character_threshold if category == 4 else self.general_threshold

                if combined_prob > threshold:
                    clean_tag = tag_name.replace("_", " ")
                    frame_tags.append(clean_tag)
                    tag_counts[clean_tag] = tag_counts.get(clean_tag, 0) + 1
            
            # 各フレームの推論結果をTXTとして保存
            txt_path = os.path.join(output_dir, f"frame{i+1}.txt")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(", ".join(frame_tags))
            print(f"フレームごとのタグを保存しました: {txt_path}")

        # 閾値(min_hits)以上のタグを採用
        found_tags = [tag for tag, count in tag_counts.items() if count >= min_hits]
                
        print(f"\n【判定完了】 検出されたタグ ({len(found_tags)}個):")
        for tag in found_tags:
            print(f"- {tag} (検出: {tag_counts[tag]}/{num_frames}フレーム)")
        
        self.save_tags_txt(output_dir, found_tags)

if __name__ == "__main__":
    tagger = VideoTaggerTest()
    
    # 入出力ディレクトリの設定
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    INPUT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "tagger_test", "input"))
    OUTPUT_BASE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data", "tagger_test", "output"))
    
    # inputフォルダ内のmp4ファイルを一括取得
    video_files = glob.glob(os.path.join(INPUT_DIR, "*.mp4"))
    
    if not video_files:
        print(f"入力フォルダに動画が見つかりません: {INPUT_DIR}")
    else:
        print(f"合計 {len(video_files)} 件の動画を処理します。")
        for video_path in video_files:
            tagger.test_single_video(video_path, OUTPUT_BASE_DIR, num_frames=5, min_hits=1)