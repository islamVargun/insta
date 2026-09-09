import json
import os
import requests
from datetime import datetime
from dotenv import load_dotenv
from apify_client import ApifyClient
from google import genai
import PIL.Image
import time

load_dotenv()

# Ayarlar
TARGET_ACCOUNT = "teolojikfelsefe1"
POSTS_LIMIT = 100
DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'posts.json')
IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'images')

# Yapay Zeka Ayarları
gemini_key = os.environ.get("GEMINI_API_KEY")
gemini_client = None
if gemini_key:
    gemini_client = genai.Client(api_key=gemini_key)

CATEGORIES = {
    "İyilik Yapmak": ["iyilik", "yardım", "sadaka", "paylaşmak"],
    "Dua": ["dua", "amin", "niyaz", "rabbim", "allah"],
    "Sabır": ["sabır", "imtihan", "zorluk"],
    "Şükür": ["şükür", "elhamdülillah", "nimet", "hamd"],
    "Ahlak": ["ahlak", "edep", "haya"],
    "İbadet": ["namaz", "oruç", "hac", "zekat", "ibadet", "secde"]
}

def determine_category_with_ai(image_path, fallback_caption):
    if not gemini_client or not os.path.exists(image_path):
        return determine_category_from_tags(fallback_caption)
        
    try:
        img = PIL.Image.open(image_path)
        prompt = "Bu resimde yer alan metni oku ve bu postun ana konusunu 1 veya en fazla 3 kelime ile özetle. (Örnek cevaplar: Cennet ve Sorgulama, Şirk ve Şefaat, Hurafecilik, Mevlana ve Kadın, Namaz, vb.). Sadece kategori adını yaz, başka hiçbir şey yazma."
        
        response = gemini_client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[prompt, img]
        )
        category = response.text.strip().replace('"', '').replace('\n', '')
        
        # Eğer yapay zeka çok uzun veya saçma bir cevap verirse fallback yap
        if len(category) > 40 or len(category) < 2:
            return determine_category_from_tags(fallback_caption)
            
        return category
    except Exception as e:
        print(f"Yapay zeka kategori belirleme hatası: {e}")
        return determine_category_from_tags(fallback_caption)

def determine_category_from_tags(text):
    if not text:
        return "Genel"
    
    tags = [word.strip("#") for word in text.split() if word.startswith("#")]
    if tags:
        return tags[0].capitalize()
        
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
import json
import os
import requests
from datetime import datetime
from dotenv import load_dotenv
from apify_client import ApifyClient
from google import genai
import PIL.Image
import time

load_dotenv()

# Ayarlar
TARGET_ACCOUNT = "teolojikfelsefe1"
POSTS_LIMIT = 100
DATA_FILE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'posts.json')
IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'images')

# Yapay Zeka Ayarları
gemini_key = os.environ.get("GEMINI_API_KEY")
gemini_client = None
if gemini_key:
    gemini_client = genai.Client(api_key=gemini_key)

CATEGORIES = {
    "İyilik Yapmak": ["iyilik", "yardım", "sadaka", "paylaşmak"],
    "Dua": ["dua", "amin", "niyaz", "rabbim", "allah"],
    "Sabır": ["sabır", "imtihan", "zorluk"],
    "Şükür": ["şükür", "elhamdülillah", "nimet", "hamd"],
    "Ahlak": ["ahlak", "edep", "haya"],
    "İbadet": ["namaz", "oruç", "hac", "zekat", "ibadet", "secde"]
}

def determine_category_with_ai(image_path, fallback_caption):
    if not gemini_client or not os.path.exists(image_path):
        return determine_category_from_tags(fallback_caption)
        
    try:
        img = PIL.Image.open(image_path)
        prompt = "Bu resimde yer alan metni oku ve bu postun ana konusunu 1 veya en fazla 3 kelime ile özetle. (Örnek cevaplar: Cennet ve Sorgulama, Şirk ve Şefaat, Hurafecilik, Mevlana ve Kadın, Namaz, vb.). Sadece kategori adını yaz, başka hiçbir şey yazma."
        
        response = gemini_client.models.generate_content(
            model='gemini-3.6-flash',
            contents=[prompt, img]
        )
        category = response.text.strip().replace('"', '').replace('\n', '')
        
        # Eğer yapay zeka çok uzun veya saçma bir cevap verirse fallback yap
        if len(category) > 40 or len(category) < 2:
            return determine_category_from_tags(fallback_caption)
            
        return category
    except Exception as e:
        print(f"Yapay zeka kategori belirleme hatası: {e}")
        return determine_category_from_tags(fallback_caption)

def determine_category_from_tags(text):
    if not text:
        return "Genel"
    
    tags = [word.strip("#") for word in text.split() if word.startswith("#")]
    if tags:
        return tags[0].capitalize()
        
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
        try:
            response = requests.get(url, stream=True, timeout=15)
            if response.status_code == 200:
                with open(filepath, 'wb') as f:
                    for chunk in response.iter_content(1024):
                        f.write(chunk)
        except Exception as e:
            print(f"Görsel indirme hatası: {e}")
    return f"/images/{filename}"

def main():
    if not os.path.exists(IMAGES_DIR):
        os.makedirs(IMAGES_DIR)

    existing_posts = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            try:
                existing_posts = json.load(f)
            except:
                pass

    existing_ids = {post['id'] for post in existing_posts}
    apify_token = os.environ.get("APIFY_API_TOKEN")
    
    if not apify_token:
        print("HATA: APIFY_API_TOKEN bulunamadı!")
        return

    client = ApifyClient(apify_token)
    run_input = {
        "directUrls": [f"https://www.instagram.com/{TARGET_ACCOUNT}/"],
        "resultsType": "posts",
        "resultsLimit": POSTS_LIMIT,
        "searchType": "hashtag",
        "searchLimit": 1,
    }

    print(f"Apify üzerinden {TARGET_ACCOUNT} sayfasından veriler çekiliyor...")
    run = client.actor("apify/instagram-scraper").call(run_input=run_input)
    
    dataset_id = run["defaultDatasetId"] if isinstance(run, dict) else getattr(run, "default_dataset_id", run.get("defaultDatasetId") if hasattr(run, "get") else None)
    if not dataset_id:
        print("HATA: Dataset ID bulunamadı.")
        return
        
    items = list(client.dataset(dataset_id).iterate_items())
    
    print(f"Apify'dan {len(items)} sonuç döndü.")
    new_posts = []
    
    for item in items:
        post_id = item.get("shortCode")
        if not post_id or post_id in existing_ids:
            continue
            
        print(f"Yeni gönderi işleniyor: {post_id}")
        image_urls = []
        if item.get("childPosts"):
            for child in item["childPosts"]:
                if child.get("displayUrl"):
                    image_urls.append(child["displayUrl"])
        elif item.get("displayUrl"):
            image_urls.append(item["displayUrl"])
            
        if not image_urls:
            continue

        local_images = []
        for idx, url in enumerate(image_urls):
            filename = f"{post_id}_{idx}.jpg" if len(image_urls) > 1 else f"{post_id}.jpg"
            local_path = download_image(url, filename)
            local_images.append(local_path)
            
        caption = item.get("caption", "")
        print("  Yapay zeka ile kategori belirleniyor...")
        full_image_path = os.path.join(IMAGES_DIR, os.path.basename(local_images[0]))
        category = determine_category_with_ai(full_image_path, caption)
        print(f"  Bulunan kategori: {category}")
        
        post_date = item.get("timestamp")
        if not post_date:
            post_date = datetime.now().isoformat()
            
        post_url = item.get("url", f"https://www.instagram.com/p/{post_id}/")

        post_data = {
            "id": post_id,
            "image": local_images[0],
            "images": local_images,
            "text": caption,
            "category": category,
            "date": post_date,
            "url": post_url
        }
        
        new_posts.append(post_data)
        existing_ids.add(post_id)
        existing_posts.insert(0, post_data)
        
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(existing_posts, f, ensure_ascii=False, indent=2)

    if new_posts:
        print(f"{len(new_posts)} yeni gönderi eklendi!")
    else:
        print("Yeni gönderi bulunamadı veya daha önceden eklenmiş.")

if __name__ == "__main__":
    main()
