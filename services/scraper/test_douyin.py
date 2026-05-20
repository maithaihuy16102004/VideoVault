"""Test tải video Douyin chất lượng gốc"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Import từ script chính
from video_downloader import download_video

# Link từ user
link = "2.56 o@d.Ag :2pm 09/06 BtR:/ 这两天是捅了泥巴窝了吗？又是一台泥巴车# 洗车 # 沉浸式洗车 # 洗车日常 # 解压洗车# 专业洗车  https://v.douyin.com/fOP8bSQPRRE/ 复制此链接，打开Dou音搜索，直接观看视频！"

download_video(link)
