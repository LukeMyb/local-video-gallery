import os
import cv2
import numpy as np
import pandas as pd
import gc
from huggingface_hub import hf_hub_download
import onnxruntime as ort
import xml.etree.ElementTree as ET # NFO(XML)出力用

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

    # 動画の中間地点からフレームを1枚抽出する
    def extract_middle_frame(self, video_path):
        print(f"動画からフレームを抽出中: {video_path}")
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames // 2) # 中間フレームへシーク
        
        ret, frame = cap.read()
        cap.release()
        return frame if ret else None

    # 抽出したタグからJellyfin互換のNFOファイルを生成する
    def generate_nfo(self, video_path, tags):
        root = ET.Element("movie")
        for tag in tags:
            tag_elem = ET.SubElement(root, "tag")
            tag_elem.text = tag
            
        tree = ET.ElementTree(root)
        ET.indent(tree, space="  ", level=0) # XMLを見やすくフォーマット
        
        nfo_path = os.path.splitext(video_path)[0] + ".nfo"
        tree.write(nfo_path, encoding="utf-8", xml_declaration=True)
        print(f"NFOファイルを生成しました: {nfo_path}")

    def test_single_video(self, video_path):
        print("=== 動画タグ付けテスト開始 ===")
        
        frame = self.extract_middle_frame(video_path)
        if frame is None:
            print("動画の読み込み、またはフレームの抽出に失敗しました。")
            return

        input_tensor = self.preprocess_image(frame)

        # 第1パス: ConvNeXt
        self._load_model(self.conv_model_name)
        conv_probs = self.session.run(None, {self.input_name: input_tensor})[0][0]
        self._unload_model()

        # 第2パス: MOAT
        self._load_model(self.moat_model_name)
        moat_probs = self.session.run(None, {self.input_name: input_tensor})[0][0]
        self._unload_model()

        found_tags = []
        for tag_idx in range(len(self.tag_names)):
            tag_name = self.tag_names[tag_idx]
            if tag_name in self.ignore_tags: continue

            c_prob = float(conv_probs[tag_idx])
            m_prob = float(moat_probs[tag_idx])
            combined_prob = max(c_prob, m_prob)

            category = self.tag_categories[tag_idx]
            threshold = self.character_threshold if category == 4 else self.general_threshold

            if combined_prob > threshold:
                clean_tag = tag_name.replace("_", " ")
                found_tags.append(clean_tag)
                
        print(f"\n【判定完了】 検出されたタグ ({len(found_tags)}個):")
        print(", ".join(found_tags))
        
        self.generate_nfo(video_path, found_tags)

if __name__ == "__main__":
    tagger = VideoTaggerTest()
    
    # テスト用の動画パス
    TEST_VIDEO = r"VIDEO_PATH"
    
    tagger.test_single_video(TEST_VIDEO)