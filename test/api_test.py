import requests

# 接続情報
JELLYFIN_URL = "http://localhost:8096" 
API_KEY = "YOUR_API_KEY"

def test_jellyfin_connection():
    """Jellyfin APIに接続し、お気に入りの動画を取得するテスト"""
    
    headers = {
        "X-Emby-Token": API_KEY
    }

    print(f"Jellyfin({JELLYFIN_URL}) からユーザー情報を取得しています...")
    
    try:
        # お気に入りはユーザーに紐づくため、まずはユーザーIDを取得する
        users_response = requests.get(f"{JELLYFIN_URL}/Users", headers=headers)
        users_response.raise_for_status()
        users = users_response.json()
        
        if not users:
            print("ユーザーが見つかりません。")
            return
            
        # 最初のユーザー（管理者）のIDと名前を取得
        user_id = users[0].get("Id")
        user_name = users[0].get("Name")
        print(f"ユーザー「{user_name}」のお気に入り動画を取得します...\n")

        # ユーザーIDを含めたエンドポイントに変更し、Filters=IsFavoriteを追加
        endpoint = f"{JELLYFIN_URL}/Users/{user_id}/Items"
        
        params = {
            "IncludeItemTypes": "Movie",
            "Recursive": "true",         
            "Fields": "Tags",            
            "Filters": "IsFavorite",     # ★追加: お気に入りのみを抽出するフィルター
            "Limit": 5                   
        }
        
        # APIリクエストの送信
        response = requests.get(endpoint, headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        items = data.get("Items", [])
        
        if not items:
            print("お気に入りに登録されている動画は見つかりませんでした。")
            return

        print("通信成功！以下のお気に入り動画データを取得しました。\n")
        
        for item in items:
            name = item.get("Name", "不明なタイトル")
            item_id = item.get("Id", "")
            tags = item.get("Tags", [])
            
            print(f"タイトル: {name}")
            print(f"ID: {item_id}")
            print(f"タグ: {tags}")
            print("-" * 30)
            
    except requests.exceptions.RequestException as e:
        print(f"通信エラーが発生しました: {e}")

if __name__ == "__main__":
    test_jellyfin_connection()