import json
from selenium import webdriver
from selenium.webdriver.edge.options import Options

options = Options()
options.add_argument('--headless=new')
options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
driver = webdriver.Edge(options=options)

driver.get("https://www.xiaohongshu.com/discovery/item/69df1bfe000000001a0323bb?source=webshare")
import time
time.sleep(5)

js = """
var state = window.__INITIAL_STATE__ || window.__INITIAL_SSR_STATE__;
if (!state) return "No state";
return JSON.stringify(state, function(key, val) {
    if (key === 'user' || key === 'comments' || key === 'recommend') return undefined; // cut noise
    return val;
});
"""
res = driver.execute_script(js)
with open("d:\\Work\\services\\video_downloader\\xhs_state.json", "w", encoding="utf-8") as f:
    f.write(res)
print("Saved to xhs_state.json")
driver.quit()
