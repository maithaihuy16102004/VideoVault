import { create } from 'zustand'

interface DownloadItem {
  id: string
  url: string
  title: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  quality: string
  platform: 'douyin' | 'tiktok' | 'xhs' | 'bilibili' | 'other'
  timestamp: number
  fileSize?: string
}

interface AppState {
  quota: {
    used: number
    total: number
  }
  downloads: DownloadItem[]
  addDownload: (url: string) => void
  updateProgress: (id: string, progress: number) => void
  completeDownload: (id: string, title: string, size: string) => void
}

export const useStore = create<AppState>((set) => ({
  quota: {
    used: 12,
    total: 30,
  },
  downloads: [
    {
      id: '1',
      url: 'https://v.douyin.com/abc/',
      title: 'Chocolate Lava Cake Tutorial',
      status: 'completed',
      progress: 100,
      quality: '1080p',
      platform: 'douyin',
      timestamp: Date.now() - 3600000,
      fileSize: '19.8 MB',
    },
    {
      id: '2',
      url: 'https://www.xiaohongshu.com/explore/123',
      title: 'Summer Fashion Outfits',
      status: 'completed',
      progress: 100,
      quality: 'Original',
      platform: 'xhs',
      timestamp: Date.now() - 7200000,
      fileSize: '45.2 MB',
    }
  ],
  addDownload: (url) => {
    const platform = url.includes('douyin') ? 'douyin' : 
                     url.includes('tiktok') ? 'tiktok' :
                     url.includes('xiaohongshu') || url.includes('xhslink') ? 'xhs' :
                     url.includes('bilibili') ? 'bilibili' : 'other';
    
    const newDownload: DownloadItem = {
      id: Math.random().toString(36).substr(2, 9),
      url,
      title: 'Đang phân tích video...',
      status: 'processing',
      progress: 0,
      quality: 'Auto',
      platform,
      timestamp: Date.now(),
    };

    set((state) => ({
      downloads: [newDownload, ...state.downloads],
      quota: { ...state.quota, used: state.quota.used + 1 }
    }));

    // Mock progress
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 15;
      if (prog >= 100) {
        prog = 100;
        clearInterval(interval);
        set((state) => ({
          downloads: state.downloads.map(d => 
            d.id === newDownload.id 
              ? { ...d, status: 'completed', progress: 100, title: 'Video Downloaded Successfully', fileSize: (Math.random() * 50 + 10).toFixed(1) + ' MB' } 
              : d
          )
        }));
      } else {
        set((state) => ({
          downloads: state.downloads.map(d => 
            d.id === newDownload.id ? { ...d, progress: Math.floor(prog) } : d
          )
        }));
      }
    }, 800);
  },
  updateProgress: (id, progress) => set((state) => ({
    downloads: state.downloads.map(d => d.id === id ? { ...d, progress } : d)
  })),
  completeDownload: (id, title, size) => set((state) => ({
    downloads: state.downloads.map(d => 
      d.id === id ? { ...d, status: 'completed', progress: 100, title, fileSize: size } : d
    )
  })),
}))
