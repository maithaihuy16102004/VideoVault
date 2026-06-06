"""Selenium Driver Pool to optimize performance by reusing instances."""
import queue
import threading
import time
from typing import Optional
from scraper.selenium_driver import _setup_edge, _setup_chrome

class SeleniumPool:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(SeleniumPool, cls).__new__(cls)
                    cls._instance._init_pool(*args, **kwargs)
        return cls._instance

    def _init_pool(self, max_size: int = 3):
        self.max_size = max_size
        self.pool = queue.Queue(maxsize=max_size)
        self.active_count = 0
        self._pool_lock = threading.Lock()

    def get_driver(self, enable_logging: bool = False, timeout: int = 30):
        """Get a driver from the pool or create a new one if limit not reached."""
        start_time = time.time()
        while True:
            # Try to get an existing driver
            try:
                driver = self.pool.get_nowait()
                # Verify driver is still alive
                try:
                    driver.current_url
                    return driver
                except Exception:
                    # Driver is dead, create a new one
                    with self._pool_lock:
                        self.active_count -= 1
            except queue.Empty:
                pass

            # Create new driver if below max_size
            with self._pool_lock:
                if self.active_count < self.max_size:
                    self.active_count += 1
                    try:
                        driver = self._create_driver(enable_logging)
                        return driver
                    except Exception as e:
                        self.active_count -= 1
                        raise e

            # Wait for a driver to be released
            if time.time() - start_time > timeout:
                raise TimeoutError("Timeout waiting for a Selenium driver from the pool.")
            time.sleep(1)

    def _create_driver(self, enable_logging: bool = False):
        """Try Edge first, then Chrome."""
        try:
            return _setup_edge(enable_logging)
        except Exception:
            try:
                return _setup_chrome(enable_logging)
            except Exception as e:
                raise Exception(f"Failed to initialize any browser: {e}")

    def release_driver(self, driver):
        """Release the driver back to the pool."""
        if not driver:
            return
            
        try:
            # Clean up the driver state for the next use
            driver.delete_all_cookies()
            driver.get("about:blank")
            self.pool.put_nowait(driver)
        except Exception:
            # If driver is broken or queue is full, just quit it
            try:
                driver.quit()
            except Exception:
                pass
            finally:
                with self._pool_lock:
                    self.active_count -= 1

    def close_all(self):
        """Close all drivers in the pool."""
        while not self.pool.empty():
            try:
                driver = self.pool.get_nowait()
                driver.quit()
                with self._pool_lock:
                    self.active_count -= 1
            except queue.Empty:
                break

# Global pool instance
driver_pool = SeleniumPool(max_size=3)
