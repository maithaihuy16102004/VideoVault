import React, { useState } from 'react'
import { 
  Download, 
  History, 
  Settings, 
  LayoutDashboard, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Video,
  ExternalLink,
  ChevronRight,
  LogOut,
  CreditCard,
  PieChart
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from './store/useStore'

const Sidebar = () => {
  const [active, setActive] = useState('dashboard')
  
  const menu = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'billing', icon: CreditCard, label: 'Billing' },
    { id: 'analytics', icon: PieChart, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="w-64 h-screen border-r border-white/10 flex flex-col p-6 fixed left-0 top-0">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <Download className="text-white" size={24} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">VideoVault</h1>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {menu.map((item) => (
          <button
            key={item.id as string}
            onClick={() => setActive(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              active === item.id 
                ? 'bg-primary/10 text-primary border border-primary/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <button className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 w-full transition-colors">
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}

const QuotaCard = () => {
  const { quota } = useStore()
  const percentage = (quota.used / quota.total) * 100

  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-400 uppercase text-xs tracking-wider">Storage & Quota</h3>
        <PieChart size={16} className="text-primary" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-2xl font-bold">{quota.total - quota.used}</span>
          <span className="text-sm text-gray-400">/ {quota.total} left</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className="h-full bg-primary"
          />
        </div>
        <p className="text-xs text-gray-500">Your daily limit resets in 12 hours.</p>
      </div>
      <button className="mt-2 text-xs font-semibold text-primary hover:text-primary-light flex items-center gap-1">
        Upgrade to Pro <ChevronRight size={12} />
      </button>
    </div>
  )
}

const DownloadItem = ({ item }: { item: Record<string, unknown> }) => {
  const platformIcons = {
    douyin: "🎵",
    tiktok: "📱",
    xhs: "📕",
    bilibili: "📺",
    other: "🌐"
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 flex items-center gap-4 group"
    >
      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-xl">
        {platformIcons[item.platform as keyof typeof platformIcons]}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate group-hover:text-primary transition-colors">
          {item.title}
        </h4>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1 uppercase">
            {item.platform}
          </span>
          {item.fileSize && <span>• {item.fileSize}</span>}
          {item.quality && <span>• {item.quality}</span>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        {item.status === 'processing' ? (
          <div className="flex items-center gap-2 text-primary font-medium text-sm">
            <Loader2 size={16} className="animate-spin" />
            <span>{item.progress}%</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
            <CheckCircle2 size={16} />
            <span>Ready</span>
          </div>
        )}
        
        {item.status === 'completed' && (
          <button className="p-2 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-lg transition-all">
            <Download size={16} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function App() {
  const { downloads, addDownload } = useStore()
  const [url, setUrl] = useState('')

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    addDownload(url)
    setUrl('')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="ml-64 flex-1 p-8 max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-1">Welcome back, User!</h2>
            <p className="text-gray-500">Ready to download some high-quality videos?</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 glass-card flex items-center justify-center text-gray-400 hover:text-white">
              <User size={20} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-8">
            {/* Download Box */}
            <section className="glass-card p-8 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <div className="flex items-center gap-3 mb-6">
                <Video className="text-primary" />
                <h3 className="text-xl font-bold">New Download</h3>
              </div>
              
              <form onSubmit={handleDownload} className="relative group">
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste video URL from Douyin, TikTok, XHS..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-lg pr-40"
                />
                <button 
                  type="submit"
                  disabled={!url}
                  className="absolute right-2 top-2 bottom-2 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:hover:bg-primary text-white px-8 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
                >
                  Fetch <ArrowRight size={18} />
                </button>
              </form>
              
              <div className="mt-6 flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> Max Quality</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> No Watermark</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" /> All Platforms</span>
              </div>
            </section>

            {/* Recent Downloads */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Recent Downloads</h3>
                <button className="text-sm text-gray-500 hover:text-white transition-colors">View all</button>
              </div>
              
              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {downloads.map((item) => (
                    <DownloadItem key={item.id as string} item={item} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <QuotaCard />
            
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-bold">Latest Updates</h3>
              <div className="space-y-3">
                {[
                  { date: 'Oct 24', msg: 'Added support for Bilibili TV' },
                  { date: 'Oct 22', msg: 'Improved XHS resolution' },
                  { date: 'Oct 15', msg: 'System maintenance complete' }
                ].map((update, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-primary font-mono whitespace-nowrap">{update.date}</span>
                    <span className="text-gray-400">{update.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6 bg-primary/10 border-primary/20 relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="font-bold text-lg mb-1">Refer a friend</h3>
                <p className="text-sm text-gray-400 mb-4">Get 10 extra downloads for each invite.</p>
                <button className="text-xs font-bold uppercase tracking-wider text-primary group-hover:underline flex items-center gap-1">
                  Copy Invite Link <ExternalLink size={12} />
                </button>
              </div>
              <Download className="absolute -right-4 -bottom-4 text-primary/10 w-24 h-24 rotate-12" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
