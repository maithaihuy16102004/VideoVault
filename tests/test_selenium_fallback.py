import unittest
from unittest.mock import patch, MagicMock
from downloader import download_with_selenium

class TestSeleniumFallback(unittest.TestCase):
    @patch('downloader._setup_driver')
    def test_fallback_when_driver_not_available(self, mock_setup_driver):
        """When driver cannot be initialized, download_with_selenium should return False."""
        mock_setup_driver.return_value = None
        with patch('builtins.print') as mock_print:
            result = download_with_selenium('https://example.com', platform='douyin')
            self.assertFalse(result)
            # Verify that fallback message was printed
            mock_print.assert_any_call("⚠️  Không thể khởi tạo trình duyệt, chuyển sang yt-dlp.")

    @patch('downloader._setup_driver')
    @patch('downloader.driver')
    def test_collect_urls_when_driver_fails(self, mock_driver, mock_setup_driver):
        """Ensure function gracefully handles driver errors during URL collection."""
        mock_setup_driver.return_value = MagicMock()
        # Simulate an exception when trying to collect URLs
        with patch('downloader._collect_urls_from_driver') as mock_collect:
            mock_collect.side_effect = Exception("DOM access failed")
            result = download_with_selenium('https://example.com', platform='douyin')
            self.assertFalse(result)
            # Ensure driver quit is called
            mock_driver.quit.assert_called_once()

if __name__ == '__main__':
    unittest.main()