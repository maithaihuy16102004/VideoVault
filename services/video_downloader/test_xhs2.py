from video_downloader import _setup_edge, _extract_xhs_video_data
import time

driver = _setup_edge(enable_logging=True)
driver.get("https://www.xiaohongshu.com/discovery/item/69f995ea00000000380371c2")
time.sleep(5)
res = driver.execute_script("return window.__INITIAL_STATE__ ? Object.keys(window.__INITIAL_STATE__) : 'No State'")
print("STATE KEYS:", res)
driver.quit()
