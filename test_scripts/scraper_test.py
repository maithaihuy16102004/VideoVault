import sys
import time
import json
import os
sys.path.append(os.path.join(os.getcwd(), 'services'))
from scraper.selenium_driver import _setup_chrome, _setup_edge

def scrape_tiktok_images(username):
    try:
        driver = _setup_edge()
    except Exception as e:
        driver = _setup_chrome()
    
    try:
        driver.get(f"https://www.tiktok.com/@{username}")
        time.sleep(8)
        images = driver.execute_script('''
            return Array.from(document.querySelectorAll('img'))
                .map(img => img.src)
                .filter(src => src.includes('tiktokcdn.com') || src.includes('p16-sign'));
        ''')
        return list(dict.fromkeys(images))[:8]
    finally:
        driver.quit()

if __name__ == '__main__':
    images = scrape_tiktok_images('chic.outfit.vn')
    with open('scraped_images.json', 'w') as f:
        json.dump(images, f)
    print(f"Scraped {len(images)} images")
