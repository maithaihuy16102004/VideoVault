import unittest
from utils import extract_url, is_douyin_url, is_tiktok_url, is_xhs_url, is_bilibili_url

class TestUtils(unittest.TestCase):
    def test_extract_url(self):
        text = "Visit https://www.douyin.com/video/12345 for more info."
        url = extract_url(text)
        self.assertEqual(url, "https://www.douyin.com/video/12345")

    def test_extract_url_no_match(self):
        self.assertIsNone(extract_url("No URL here"))

    def test_is_douyin_url(self):
        self.assertTrue(is_douyin_url("https://www.douyin.com/user/123"))
        self.assertTrue(is_douyin_url("http://v.douyin.com/abc"))
        self.assertFalse(is_douyin_url("https://example.com"))

    def test_is_tiktok_url(self):
        self.assertTrue(is_tiktok_url("https://www.tiktok.com/@user/video/12345"))
        self.assertFalse(is_tiktok_url("https://example.com"))

    def test_is_xhs_url(self):
        self.assertTrue(is_xhs_url("https://www.xiaohongshu.com/user/profile/123"))
        self.assertTrue(is_xhs_url("https://xhslink.com/abc"))
        self.assertFalse(is_xhs_url("https://example.com"))

    def test_is_bilibili_url(self):
        self.assertTrue(is_bilibili_url("https://www.bilibili.com/12345"))
        self.assertTrue(is_bilibili_url("http://bilibili.tv/abc"))
        self.assertFalse(is_bilibili_url("https://example.com"))

if __name__ == '__main__':
    unittest.main()