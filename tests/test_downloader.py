import unittest
from unittest.mock import patch, MagicMock
from downloader import _download_file

class TestDownloadFile(unittest.TestCase):
    @patch('requests.Session')
    @patch('downloader.os.makedirs')
    @patch('downloader.open', MagicMock())
    def test_download_success(self, mock_open, mock_makedirs):
        """Test successful download returns True and writes file."""
        # Mock session and response
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.headers = {'content-length': '100'}
        mock_resp.iter_content.return_value = [b'A' * 10, b'B' * 10]
        mock_resp.__len__.return_value = 20  # simulate total size

        mock_session = MagicMock()
        mock_session.get.return_value = mock_resp
        with patch('downloader.requests.Session', return_value=mock_session):
            # Mock cookies and referer
            cookies = {'sessionid': '123'}
            referer = 'https://www.douyin.com/'
            # Call function
            result = _download_file('https://example.com/video.mp4', 'test_title', cookies, referer)
            self.assertTrue(result)
            # Ensure directory created
            mock_makedirs.assert_called_once_with('Downloads')
            # Ensure file opened
            mock_open.assert_called_once()

    @patch('requests.Session')
    def test_download_non_200_returns_false(self, mock_session):
        """Test that non-200 status returns False."""
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_session.get.return_value = mock_resp
        cookies = {}
        result = _download_file('https://example.com/video.mp4', 'test', cookies, 'https://example.com/')
        self.assertFalse(result)

    @patch('requests.Session')
    def test_download_exception_returns_false(self, mock_session):
        """Test that any exception during download returns False."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.iter_content.side_effect = Exception('Network error')
        mock_session.get.return_value = mock_resp
        cookies = {}
        result = _download_file('https://example.com/video.mp4', 'test', cookies, 'https://example.com/')
        self.assertFalse(result)


if __name__ == '__main__':
    unittest.main()