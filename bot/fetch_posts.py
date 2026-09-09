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
POSTS_LIMIT = 5
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
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
    return f"/images/{filename}"

def main():
    apify_token = os.environ.get("APIFY_API_TOKEN")
    if not apify_token:
        print("HATA: APIFY_API_TOKEN bulunamadı. Lütfen .env dosyanızı veya GitHub Secrets'ı kontrol edin.")
        return

    print(f"Apify üzerinden {TARGET_ACCOUNT} sayfasından veriler çekiliyor...")
    client = ApifyClient(apify_token)

    # Apify Instagram Scraper Actor (ID: apify/instagram-scraper)
    run_input = {
        "directUrls": [f"https://www.instagram.com/{TARGET_ACCOUNT}/"],
        "resultsLimit": POSTS_LIMIT,
        "resultsType": "posts",
    }

    print("Veri çekme işlemi başlatıldı, bu işlem 1-2 dakika sürebilir...")
    run = client.actor("apify/instagram-scraper").call(run_input=run_input)
    
    # Yeni apify-client sürümlerinde run bir obje olarak döner.
    dataset_id = None
    if hasattr(run, "default_dataset_id"):
        dataset_id = run.default_dataset_id
    elif isinstance(run, dict):
        dataset_id = run.get("defaultDatasetId")

    if not dataset_id:
        print("Veri çekme başarısız oldu veya dataset_id bulunamadı.")
        return

    dataset_items = client.dataset(dataset_id).iterate_items()

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

    fetched_items = list(dataset_items)
    print(f"Apify'dan {len(fetched_items)} sonuç döndü.")

    for item in fetched_items:
        if "shortCode" not in item:
            continue
            
        post_id = item["shortCode"]
        if post_id in existing_ids:
            continue
            
        print(f"Yeni gönderi işleniyor: {post_id}")
        
        # Görselleri topla (Carousel/Albüm destekli)
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
        
        # Kategori belirleme - yapay zeka ile
        # Yapay zeka'yı sadece yeni eklenenler için yoruyoruz (API limitine takılmamak için)
        print("  Yapay zeka ile kategori belirleniyor...")
        # local_images[0] bir web adresi değil, yerel diskteki tam yolu vermemiz gerekiyor
        # local_path örneği: /images/xxx.jpg
        # Bizim tam dosya yolu vermemiz lazım: IMAGES_DIR / xxx.jpg
        full_image_path = os.path.join(IMAGES_DIR, os.path.basename(local_images[0]))
        
        category = determine_category_with_ai(full_image_path, caption)
        print(f"  Bulunan kategori: {category}")
        
        post_date = item.get("timestamp")
        if not post_date:
            post_date = datetime.utcnow().isoformat() + "Z"
            
        new_post = {
            "id": post_id,
            "image": local_images[0], # Ana resim (eski kodla uyumluluk)
            "images": local_images,   # Tüm resimler
            "text": caption,
            "category": category,
            "date": post_date,
            "url": item.get("url", f"https://instagram.com/p/{post_id}")
        }
        
        posts.insert(0, new_post)
        new_posts_count += 1

    if new_posts_count > 0:
        # Tarihe göre sırala (en yeni en üstte)
        posts.sort(key=lambda x: x.get("date", ""), reverse=True)
        
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(posts, f, ensure_ascii=False, indent=2)
        print(f"{new_posts_count} yeni gönderi eklendi!")
    else:
        print("Yeni gönderi bulunamadı veya daha önceden eklenmiş.")

if __name__ == "__main__":
    main()
