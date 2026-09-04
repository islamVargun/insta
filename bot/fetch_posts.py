import instaloader
import json
import os
import requests
from datetime import datetime

# Ayarlar
TARGET_ACCOUNT = "teolojikfelsefe1" # Değiştirilebilir
POSTS_LIMIT = 5 # Her çalışmada kontrol edilecek gönderi sayısı
DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'posts.json')
IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'images')

# Kategorizasyon için anahtar kelimeler
CATEGORIES = {
    "İyilik Yapmak": ["iyilik", "yardım", "sadaka", "paylaşmak"],
    "Dua": ["dua", "amin", "niyaz", "rabbim", "allah"],
    "Sabır": ["sabır", "imtihan", "zorluk"],
    "Şükür": ["şükür", "elhamdülillah", "nimet", "hamd"],
    "Ahlak": ["ahlak", "edep", "haya"],
    "İbadet": ["namaz", "oruç", "hac", "zekat", "ibadet", "secde"]
}

def determine_category(text):
    text_lower = text.lower()
    for category, keywords in CATEGORIES.items():
        for keyword in keywords:
            if keyword in text_lower:
                return category
    return "Genel"

def download_image(url, filename):
    if not os.path.exists(IMAGES_DIR):
        os.makedirs(IMAGES_DIR)
    
    filepath = os.path.join(IMAGES_DIR, filename)
    
    if not os.path.exists(filepath):
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
    return f"/images/{filename}"

def main():
    print(f"{TARGET_ACCOUNT} sayfasından gönderiler çekiliyor...")
    
    L = instaloader.Instaloader(download_pictures=False, download_video_thumbnails=False, download_videos=False, download_geotags=False, download_comments=False)
    
    try:
        profile = instaloader.Profile.from_username(L.context, TARGET_ACCOUNT)
    except Exception as e:
        print(f"Hata: {e}")
        return

    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            try:
                posts = json.load(f)
            except:
                posts = []
    else:
        posts = []
        
    existing_ids = [post.get('id') for post in posts]
    new_posts_count = 0
    
    for post in profile.get_posts():
        if new_posts_count >= POSTS_LIMIT:
            break
            
        post_id = post.shortcode
        
        if post_id in existing_ids:
            continue
            
        print(f"Yeni gönderi bulundu: {post_id}")
        
        image_url = post.url
        image_filename = f"{post_id}.jpg"
        local_image_path = download_image(image_url, image_filename)
        
        caption = post.caption if post.caption else ""
        category = determine_category(caption)
        
        new_post = {
            "id": post_id,
            "image": local_image_path,
            "text": caption,
            "category": category,
            "date": post.date_utc.isoformat() + "Z",
            "url": f"https://instagram.com/p/{post_id}"
        }
        
        posts.insert(0, new_post)
        new_posts_count += 1
        
    if new_posts_count > 0:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(posts, f, ensure_ascii=False, indent=2)
        print(f"{new_posts_count} yeni gönderi eklendi!")
    else:
        print("Yeni gönderi bulunamadı.")

if __name__ == "__main__":
    main()
