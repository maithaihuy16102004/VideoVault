from video_downloader import _setup_edge, _extract_xhs_video_data
import time

driver = _setup_edge(enable_logging=True)
driver.get("https://www.xiaohongshu.com/discovery/item/69f995ea00000000380371c2")
time.sleep(5)
res = driver.execute_script("""
    var target_id = '69f995ea00000000380371c2';
    var noteMap = window.__INITIAL_STATE__.note.noteDetailMap;
    var noteData = noteMap[target_id] || noteMap['undefined'];
    var note = noteData.note || noteData;
    return { title: note.title, desc: note.desc, tagList: note.tagList };
""")
print("NOTE DATA:", res)
driver.quit()
