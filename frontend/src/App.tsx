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
  PieChart,
  Sparkles
} from 'lucide-react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { useStore } from './store/useStore'

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

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
    <div className="w-64 h-screen border-r border-white/5 bg-background/50 backdrop-blur-xl flex flex-col p-6 fixed left-0 top-0 z-50">
      <div className="flex items-center gap-3 mb-12 px-2">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)]">
          <Download className="text-white" size={24} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">VideoVault</h1>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {menu.map((item) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
              active === item.id 
                ? 'text-white font-semibold' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {active === item.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent border-l-2 border-primary rounded-xl"
                initial={false}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <item.icon size={20} className={`relative z-10 transition-colors ${active === item.id ? 'text-primary' : 'group-hover:text-primary'}`} />
            <span className="relative z-10">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <button className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 w-full transition-colors rounded-xl hover:bg-red-500/10">
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
    <motion.div variants={itemVariants} className="glass-card p-6 flex flex-col gap-4 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-colors" />
      
      <div className="flex justify-between items-center relative z-10">
        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider">Storage & Quota</h3>
        <PieChart size={16} className="text-primary" />
      </div>
      <div className="space-y-2 relative z-10">
        <div className="flex justify-between items-end">
          <span className="text-4xl font-extrabold text-white">{quota.total - quota.used}</span>
          <span className="text-sm text-gray-400 mb-1">/ {quota.total} left</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-secondary"
          />
        </div>
        <p className="text-xs text-gray-500 font-medium">Your daily limit resets in 12 hours.</p>
      </div>
      <button className="mt-4 py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold text-white flex justify-between items-center transition-colors relative z-10">
        Upgrade to Pro <ChevronRight size={16} className="text-primary" />
      </button>
    </motion.div>
  )
}

const DownloadItem = ({ item }: { item: any }) => {
  const platformIcons = {
    douyin: "🎵",
    tiktok: "📱",
    xhs: "📕",
    bilibili: "📺",
    other: "🌐"
  }

  return (
    <motion.div 
      variants={itemVariants}
      layout
      className="glass-card p-4 flex items-center gap-4 group cursor-default"
    >
      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-2xl border border-white/5 group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all">
        {platformIcons[item.platform as keyof typeof platformIcons]}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-lg truncate group-hover:text-primary transition-colors text-white">
          {item.title}
        </h4>
        <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
          <span className="flex items-center gap-1.5 uppercase font-medium bg-white/5 px-2 py-0.5 rounded-md text-xs">
            {item.platform}
          </span>
          {item.fileSize && <span>{item.fileSize}</span>}
          {item.quality && <span>{item.quality}</span>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 pr-2">
        {item.status === 'processing' ? (
          <div className="flex items-center gap-2 text-primary font-medium text-sm bg-primary/10 px-3 py-1 rounded-full">
            <Loader2 size={16} className="animate-spin" />
            <span>{item.progress}%</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-green-400 text-sm font-semibold bg-green-400/10 px-3 py-1 rounded-full">
            <CheckCircle2 size={16} />
            <span>Ready</span>
          </div>
        )}
        
        {item.status === 'completed' && (
          <button className="p-2.5 bg-primary hover:bg-primary-dark text-background rounded-xl transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)] hover:shadow-[0_0_15px_rgba(0,240,255,0.6)] active:scale-95">
            <Download size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function App() {
  const { downloads, addDownload } = useStore()
  const [url, setUrl] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return
    addDownload(url)
    setUrl('')
  }

  return (
    <div className="flex min-h-screen bg-background text-white selection:bg-primary/30">
      <Sidebar />
      
      <main className="ml-64 flex-1 p-10 max-w-7xl mx-auto">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-end mb-12"
        >
          <div>
            <h2 className="text-4xl font-extrabold mb-2 tracking-tight">
              Welcome back, <span className="text-gradient">Creator!</span>
            </h2>
            <p className="text-gray-400 font-medium text-lg">Ready to download some high-quality videos today?</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-12 h-12 glass-card flex items-center justify-center text-gray-300 hover:text-primary hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all">
              <User size={22} />
            </button>
          </div>
        </motion.header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 gap-8"
        >
          <div className="col-span-2 space-y-8">
            {/* Download Box */}
            <motion.section variants={itemVariants} className="glass-card p-8 border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Video size={120} />
              </div>
              
              <div className="relative z-10 flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Sparkles className="text-primary" size={24} />
                </div>
                <h3 className="text-2xl font-bold">Smart Downloader</h3>
              </div>
              
              <form onSubmit={handleDownload} className="relative z-10">
                <div className="magic-input-wrapper">
                  <input 
                    type="text" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Paste URL from Douyin, TikTok, Xiaohongshu..."
                    className="w-full bg-[#0d0d14] border border-white/10 rounded-[1rem] px-6 py-5 focus:outline-none focus:border-primary/50 transition-all text-lg pr-44 placeholder:text-gray-600 font-medium"
                  />
                  <button 
                    type="submit"
                    disabled={!url}
                    className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-primary to-secondary hover:brightness-110 disabled:opacity-50 disabled:filter-none text-background px-8 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 text-[15px]"
                  >
                    Fetch <ArrowRight size={18} strokeWidth={2.5} />
                  </button>
                </div>
              </form>
              
              <div className="mt-8 flex gap-6 text-sm text-gray-400 font-medium relative z-10">
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full"><CheckCircle2 size={16} className="text-primary" /> Original Quality</span>
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full"><CheckCircle2 size={16} className="text-primary" /> No Watermark</span>
                <span className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full"><CheckCircle2 size={16} className="text-primary" /> Auto Translate</span>
              </div>
            </motion.section>

            {/* Recent Downloads */}
            <motion.section variants={containerVariants}>
              <div className="flex items-center justify-between mb-6 px-1">
                <h3 className="text-2xl font-bold">Recent Activity</h3>
                <button className="text-sm font-semibold text-primary hover:text-white transition-colors">View all history &rarr;</button>
              </div>
              
              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {downloads.map((item) => (
                    <DownloadItem key={item.id as string} item={item} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          </div>

          <div className="space-y-8">
            <QuotaCard />
            
            <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <span className="text-secondary font-bold text-sm">✨</span>
                </div>
                <h3 className="font-bold text-lg">System Updates</h3>
              </div>
              <div className="space-y-4">
                {[
                  { date: 'Today', msg: 'Improved Douyin 4K resolution extraction', new: true },
                  { date: 'Yesterday', msg: 'Added support for Bilibili TV subtitles', new: false },
                  { date: 'Oct 15', msg: 'Optimized TTS voice speed processing', new: false }
                ].map((update, i) => (
                  <div key={i} className="flex gap-4 items-start group cursor-default">
                    <span className={`text-sm font-bold min-w-[70px] ${update.new ? 'text-secondary' : 'text-gray-500'}`}>
                      {update.date}
                    </span>
                    <span className="text-gray-300 text-sm leading-relaxed group-hover:text-white transition-colors">{update.msg}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="glass-card p-8 bg-gradient-to-br from-primary/10 to-secondary/5 border-primary/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="bg-white/10 w-max p-2 rounded-lg mb-4 text-primary">
                  <User size={24} />
                </div>
                <h3 className="font-bold text-xl mb-2 text-white">Refer a friend</h3>
                <p className="text-gray-400 mb-6 font-medium">Get 10 extra daily downloads for each invite you send.</p>
                <button className="w-full py-3 bg-white/10 hover:bg-primary/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all group-hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                  Copy Invite Link <ExternalLink size={16} className="text-primary" />
                </button>
              </div>
              <Download className="absolute -right-8 -bottom-8 text-primary/10 w-40 h-40 rotate-12 group-hover:rotate-[24deg] group-hover:scale-110 transition-transform duration-700" />
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default App
