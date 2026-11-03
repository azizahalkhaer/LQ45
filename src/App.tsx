/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  TrendingUp, 
  PieChart, 
  Activity, 
  Search, 
  Bell, 
  Settings, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Target,
  Layers,
  Wallet,
  Cpu,
  Trash2,
  AlertCircle,
  Filter,
  ArrowUpDown,
  Clock,
  MessageCircle,
  Newspaper
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Bar,
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
// --- Lexicon Based Sentiment ---
const getIDXOpeningTimeUTC = () => {
  const now = new Date();
  const opening = new Date(now);
  opening.setUTCHours(2, 0, 0, 0); // 09:00 WIB is 02:00 UTC
  
  // Day of week: 0 is Sunday, 6 is Saturday
  const day = now.getUTCDay();
  
  // If it's Monday before 02:00 UTC, the previous session was Friday
  if (day === 1 && now.getTime() < opening.getTime()) {
    opening.setUTCDate(opening.getUTCDate() - 3);
  } else if (day === 0) { // Sunday, last was Friday
    opening.setUTCDate(opening.getUTCDate() - 2);
  } else if (day === 6) { // Saturday, last was Friday
    opening.setUTCDate(opening.getUTCDate() - 1);
  } else if (now.getTime() < opening.getTime()) {
    opening.setUTCDate(opening.getUTCDate() - 1);
  }
  
  return opening.getTime() / 1000;
};

const POSITIVE_WORDS = [
  'serok', 'haka', 'hajar kanan', 'to the moon', 'tp', 'take profit', 'bullish', 'akumulasi', 'ara', 'borong',
  'terbang', 'breakout', 'mantap', 'gaskeun', 'bull', 'lambo', 'cuan', 'pompom', 'avg up', 
  'up', 'moon', 'profit', 'laba', 'beli', 'buy', 'add', 'hold', 'mantul'
];
const NEGATIVE_WORDS = [
  'guyur', 'nyangkut', 'cutloss', 'bocor', 'bearish', 'arb', 'rugi', 'anjlok', 'sell', 'jual', 'loss', 
  'haki', 'hajar kiri', 'sangkut', 'dump', 'ritel', 'jeblok', 'downtrend', 'longsor', 'boncos',
  'berdarah', 'exit', 'fomo', 'panic', 'guyur bandar'
];
const HOLD_WORDS = ['wait and see', 'sideways', 'bo', 'konsolidasi', 'pantau', 'hold dulu'];

const STOPWORDS = new Set([
  // Indonesian fillers & common noise
  'yang', 'dan', 'ini', 'di', 'pada', 'untuk', 'dengan', 'itu', 'adalah', 'dari', 'ke', 'ya', 'aja', 'lah', 'bisa', 'ada', 'buat', 'kalau', 'si', 'tapi', 'sudah', 'gak', 'udah', 'lagi', 'sampai', 'juga', 'kok', 'nih', 'deh', 'sih', 'kan', 'dong', 'biar', 'atau', 'oleh', 'dalam', 'secara', 'seperti', 'lebih', 'banyak', 'beberapa', 'tersebut', 'menjadi', 'karena', 'telah', 'akan', 'sebagai', 'saham', 'stockbit', 'jk', 'co', 'id', 'com', 'inc', 'corp', 'limited', 'berita', 'kini', 'hari', 'saat', 'melalui', 'tentang', 'emiten', 'sektor', 'indeks', 'harga', 'nilai', 'tbk', 'pt', 'perusahaan', 'perseroan', 'mandiri', 'rakyat', 'indonesia', 'central', 'asia', 'telekomunikasi', 'global', 'investasi', 'nasional', 'daerah', 'tbk',
  // Specific noise from common emiten names
  'bank', 'telekom', 'bumi', 'sumber', 'daya', 'lestari', 'tata', 'sarana', 'aneka', 'tambang', 'bukit', 'asam', 'semen', 'indocement', 'gudang', 'garam', 'sampoerna',
  // English fillers to exclude
  'the', 'is', 'to', 'in', 'of', 'for', 'a', 'an', 'and', 'with', 'on', 'at', 'by', 'this', 'that', 'it', 'from', 'as', 'are', 'was', 'were', 'not', 'will', 'be', 'has', 'have', 'had', 'its', 'their', 'they', 'our', 'we', 'you', 'if', 'but', 'or', 'as', 'if', 'when', 'who', 'how', 'which', 'up', 'down', 'out', 'over', 'now', 'all', 'only', 'new', 'more', 'some', 'any', 'can', 'may', 'see', 'buy', 'sell', 'hold', 'news', 'stock', 'market', 'price', 'share', 'shares', 'trading', 'investing',
  // Ticker noise
  'idx', 'tbk', 'bca', 'bri', 'mandiri', 'bni', 'telkom', 'goto', 'asii', 'tlkm', 'bbca', 'bbri', 'bmri', 'bbni'
]);

const getLexiconSentiment = (text: string, rawItems: any[] = [], excludeWords: string[] = []): Sentiment => {
  // Advanced Preprocessing: Remove emojis, usernames, links, and hashtags
  const cleanSnippet = (t: string) => {
    return t.toLowerCase()
      .replace(/https?:\/\/[^\s]+/g, '') // Remove links
      .replace(/@\w+/g, '')             // Remove usernames (@stockbit_user)
      .replace(/#\w+/g, '')             // Remove hashtags
      .replace(/[^\w\s\$\.]/g, ' ')     // Remove symbols/emojis
      .replace(/(\b\w+\b)\s+\1/g, '$1') // Simple repeat spam filter
      .replace(/\s+/g, ' ')             // Collapse whitespace
      .trim();
  };

  const lowercaseText = cleanSnippet(text);
  const localExcluded = new Set([...excludeWords.map(w => w.toLowerCase().trim()).filter(w => w.length > 0)]);
  
  let posCount = 0;
  let negCount = 0;
  const posMap: Record<string, number> = {};
  const negMap: Record<string, number> = {};

  // Scoring weights: +1 for positive, -1 for negative
  const scoreSnippet = (t: string) => {
    let score = 0;
    const cleanT = cleanSnippet(t);
    POSITIVE_WORDS.forEach(p => {
      const regex = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = cleanT.match(regex);
      if (matches) score += matches.length;
    });
    NEGATIVE_WORDS.forEach(n => {
      const regex = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = cleanT.match(regex);
      if (matches) score -= matches.length;
    });
    return score;
  };

  // Check for lexicon phrases globally
  POSITIVE_WORDS.forEach(phrase => {
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'gi');
    const matches = lowercaseText.match(regex);
    if (matches) {
      posCount += matches.length;
      posMap[phrase] = (posMap[phrase] || 0) + matches.length;
    }
  });

  NEGATIVE_WORDS.forEach(phrase => {
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'gi');
    const matches = lowercaseText.match(regex);
    if (matches) {
      negCount += matches.length;
      negMap[phrase] = (negMap[phrase] || 0) + matches.length;
    }
  });
  
  // Identify top Strongest Signals (snippets with highest absolute score)
  const signalSnippets = rawItems
    .map(item => {
      const content = `${item.title || item.text} ${item.description || ''}`;
      const score = scoreSnippet(content);
      let verdict = 'NEUTRAL';
      if (score > 0) verdict = 'BULLISH';
      if (score < 0) verdict = 'BEARISH';

      return {
        text: item.title || item.text,
        verdict,
        time: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '09:00 WIB',
        author: `@${(item.author || 'retail_investor').replace(/\s+/g, '')}`
      };
    })
    .sort((a, b) => (a.verdict !== 'NEUTRAL' ? 1 : -1))
    .slice(0, 8); 

  // Calculate N-Grams (Word Frequency)
  const words = lowercaseText.split(/\s+/);
  const freqMap: Record<string, number> = {};
  words.forEach(w => {
    const cleanW = w.replace(/[^\w]/g, '').trim();
    if (cleanW.length > 2 && !STOPWORDS.has(cleanW) && !localExcluded.has(cleanW) && !/^\d+$/.test(cleanW)) {
      freqMap[cleanW] = (freqMap[cleanW] || 0) + 1;
    }
  });

  const topNGrams = Object.entries(freqMap)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const positiveWords = Object.entries(posMap)
    .map(([text, weight]) => ({ text, weight }))
    .sort((a, b) => b.weight - a.weight);
  const negativeWords = Object.entries(negMap)
    .map(([text, weight]) => ({ text, weight }))
    .sort((a, b) => b.weight - a.weight);

  const total = posCount + negCount;
  
  if (total === 0 && topNGrams.length === 0) return { 
    score: 0.5, 
    directionalScore: 0,
    explanation: "Memantau berita bisnis CNN Indonesia...",
    positiveWords: [],
    negativeWords: [],
    topNGrams: [],
    posCount: 0,
    negCount: 0,
    totalItems: rawItems.length,
    signals: signalSnippets
  };

  const score = total > 0 ? posCount / total : 0.5;
  const directionalScore = total > 0 ? (posCount - negCount) / total : 0;
  
  const statusLabels = ["Sangat Pesimis", "Bearish", "Konsolidasi", "Bullish", "Sangat Optimis"];
  const statusIdx = Math.min(Math.floor(score * 5), 4);
  const status = statusLabels[statusIdx];

  return { 
    score, 
    directionalScore,
    explanation: `${status}: Menemukan ${total} ulasan sentimen dalam berita CNN Indonesia.`,
    positiveWords,
    negativeWords,
    topNGrams,
    posCount,
    negCount,
    totalItems: rawItems.length,
    signals: signalSnippets
  };
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Sentiment {
  score: number;
  sentimentScore?: number;
  totalChatter?: number;
  directionalScore?: number;
  explanation: string;
  positiveWords: { text: string, weight: number }[];
  negativeWords: { text: string, weight: number }[];
  topNGrams: { text: string, count: number }[];
  posCount: number;
  negCount: number;
  totalItems?: number;
  signals?: { text: string, verdict: string, time: string, author: string }[];
  marketWindow?: { start: string, end: string };
}

interface StockSummary {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pe: number;
  pb: number;
  der: number;
  rsi: number;
  ema50: number;
  ema200: number;
  isGoldenCross: boolean;
  isUndervalued: boolean;
}

interface PriceAlert {
  ticker: string;
  threshold: number;
  type: 'above' | 'below';
  hit?: boolean;
}

interface Notification {
  id: string;
  ticker: string;
  price: number;
  threshold: number;
  type: 'above' | 'below';
  time: Date;
}


// --- Components ---

const Sidebar = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  const items = [
    { id: 'overview', icon: Activity, label: 'Overview' },
    { id: 'analysis', icon: TrendingUp, label: 'Analysis' },
    { id: 'screener', icon: Filter, label: 'Screener' },
    { id: 'portfolio', icon: Wallet, label: 'Portfolio' },
  ];

  return (
    <aside className="w-20 md:w-64 h-full border-r border-glass-border flex flex-col items-center md:items-start py-8 gap-12 bg-navy/50 backdrop-blur-md">
      <div className="flex items-center gap-3 px-6">
        <h1 className="text-xl font-bold tracking-tight hidden md:block">BUY/BYE</h1>
      </div>
      
      <nav className="flex-1 flex flex-col gap-4 w-full px-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 w-full group",
              activeTab === item.id 
                ? "bg-electric-cyan/10 text-electric-cyan border border-electric-cyan/20" 
                : "text-slate-400 hover:text-white hover:bg-glass"
            )}
          >
            <item.icon size={22} className={cn(activeTab === item.id && "pulse-glow")} />
            <span className="font-medium hidden md:block">{item.label}</span>
            {activeTab === item.id && (
              <motion.div 
                layoutId="sidebar-active"
                className="ml-auto w-1.5 h-1.5 rounded-full bg-electric-cyan"
              />
            )}
          </button>
        ))}
      </nav>

      <div className="px-4 w-full mt-auto mb-8">
        <div className="p-4 bg-glass border border-glass-border rounded-xl">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="text-[10px] font-bold text-slate-300">SYSTEM LIVE</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Header = ({ notifications, clearNotifications }: { notifications: Notification[], clearNotifications: () => void }) => {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="h-20 border-b border-glass-border flex items-center justify-between px-8 bg-dark-bg/50 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-4 bg-glass border border-glass-border px-4 py-2 rounded-xl w-96 max-w-full">
        <Search size={18} className="text-slate-400" />
        <input 
          type="text" 
          placeholder="Search LQ45 Tickers..." 
          className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-500"
        />
      </div>
      
      <div className="flex items-center gap-6">
        <div className="relative">
          <div 
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 bg-glass border border-glass-border rounded-lg relative cursor-pointer hover:bg-glass/20 transition-colors"
          >
            <Bell size={20} className="text-slate-300" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-dark-bg animate-pulse"></span>
            )}
          </div>

          <AnimatePresence>
            {showDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-4 w-80 glass-panel overflow-hidden z-[60] p-0"
              >
                <div className="p-4 border-b border-glass-border flex items-center justify-between bg-glass/20">
                  <h4 className="font-bold text-sm">Notifications</h4>
                  <button 
                    onClick={clearNotifications}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No active alerts
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-4 border-b border-glass-border hover:bg-glass/10 transition-colors flex gap-3">
                        <div className="mt-1">
                          <AlertCircle size={16} className="text-electric-cyan" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold">{n.ticker} Target Hit!</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Price: Rp {n.price.toLocaleString('id-ID')} ({n.type} {n.threshold})
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {n.time.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

const MetricCard = ({ title, value, trend, subtext, color = "cyan" }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ 
      y: -8, 
      scale: 1.03,
      boxShadow: color === "cyan" 
        ? "0 20px 40px rgba(0, 242, 255, 0.15)" 
        : "0 20px 40px rgba(112, 0, 255, 0.15)"
    }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="glass-panel p-6 flex flex-col gap-4 group cursor-pointer"
  >
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">{title}</span>
      <div className={cn(
        "p-2 rounded-lg opacity-80",
        color === "cyan" ? "bg-electric-cyan/20 text-electric-cyan" : "bg-deep-purple/20 text-deep-purple"
      )}>
        <Layers size={18} />
      </div>
    </div>
    <div className="flex flex-col">
      <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
      <div className="flex items-center gap-2 mt-1">
        <span className={cn(
          "text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
          trend > 0 ? "bg-neon-green/20 text-neon-green" : "bg-red-500/20 text-red-400"
        )}>
          {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend)}%
        </span>
        <span className="text-xs text-slate-500">{subtext}</span>
      </div>
    </div>
  </motion.div>
);

const CNNSentimentCard = ({ sentiment, ticker }: { sentiment: Sentiment | null, ticker: string }) => {
  if (!sentiment) return null;

  const sentimentVal = sentiment.sentimentScore !== undefined ? sentiment.sentimentScore : (sentiment.score * 2 - 1);
  const totalChatter = sentiment.totalChatter || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 flex flex-col gap-6 border-deep-purple/20 ring-1 ring-deep-purple/5 relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-deep-purple/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="flex items-center justify-between relative z-20">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] font-black tracking-[0.2em] text-[#EF4444] uppercase">
              CNN Indonesia Market Sentiment
            </h4>
            <span className="bg-[#EF4444]/15 text-[#EF4444] text-[8px] font-black px-1.5 py-0.5 rounded border border-[#EF4444]/30 uppercase tracking-widest">
              {totalChatter} Articles Analyzed
            </span>
          </div>
          <span className="text-xl font-black text-white">
            {ticker.split('.')[0]} Sentimen Berita CNN
          </span>
          {sentiment.marketWindow && (
            <div className="flex items-center gap-1 mt-1 font-mono">
              <Clock size={10} className="text-slate-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                Market Bulletin window: {sentiment.marketWindow.start} - {sentiment.marketWindow.end}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Aggregate Sentiment</span>
            <span className={cn(
              "text-lg font-black font-mono",
              sentimentVal > 0.15 ? "text-[#00FF85]" : sentimentVal < -0.15 ? "text-[#EF4444]" : "text-[#F59E0B]"
            )}>
              {sentimentVal > 0 ? '+' : ''}{sentimentVal.toFixed(2)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-slate-900 border-[#EF4444]/20 text-[#EF4444] shadow-md shadow-[#EF4444]/5">
            <Newspaper size={22} className="animate-pulse" />
          </div>
        </div>
      </div>

      <div className="glass-panel p-4 bg-slate-950/80 border-slate-800 relative z-20">
         <p className="text-[12px] font-medium text-slate-300 italic leading-relaxed">
            "Trend Pulse: Hasil analisis text-mining terhadap sentimen berita harian & artikel korporasi terbaru dari rubrik Ekonomi & Bisnis CNN Indonesia."
         </p>
      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-white/5 relative z-20">
        <div className="flex items-center justify-between px-1">
          <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">
            CNN Indonesia News Feed (Live Bulletin Flow)
          </p>
          <span className="text-[8px] font-black text-[#EF4444] uppercase tracking-widest">CNN Business</span>
        </div>
        
        <div className="relative h-[350px] overflow-hidden rounded-2xl border border-white/5 bg-slate-950/40">
          <motion.div 
            animate={sentiment.signals && sentiment.signals.length > 5 ? { y: [0, -1500, 0] } : {}}
            transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
            className="flex flex-col gap-3 p-3"
          >
            {(sentiment.signals || []).map((signal, i) => (
              <div key={`${signal.author}-${i}`} className="glass-panel p-4 bg-white/5 border-white/5 group hover:bg-white/10 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <p className="text-[13px] font-medium text-slate-200 leading-relaxed">{signal.text}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#EF4444] to-slate-900 flex items-center justify-center text-[8px] font-bold text-white shadow-inner">
                         CNN
                       </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{signal.author}</span>
                      <span className="text-[9px] text-slate-600">•</span>
                      <span className="text-[9px] text-slate-500 font-mono italic">{signal.time}</span>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-md border tracking-widest shrink-0 shadow-sm transition-all group-hover:scale-105",
                    signal.verdict.includes('BUY') || signal.verdict === 'BULLISH' ? "bg-[#00FF85]/10 text-[#00FF85] border-[#00FF85]/30 shadow-[#00FF85]/5" : 
                    signal.verdict.includes('SELL') || signal.verdict === 'BEARISH' ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30 shadow-[#EF4444]/5" : 
                    "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30 shadow-[#F59E0B]/5"
                  )}>
                    {signal.verdict}
                  </span>
                </div>
              </div>
            ))}
            {(sentiment.signals?.length === 0) && (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 py-20">
                <div className="w-8 h-8 border-2 border-slate-800 border-t-[#EF4444] rounded-full animate-spin" />
                <p className="text-[10px] uppercase font-black tracking-widest text-center text-slate-500">
                  Searching CNN Indonesia News Stream...
                </p>
              </div>
            )}
          </motion.div>
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 to-transparent z-10 pointer-events-none" />
        </div>
      </div>
    </motion.div>
  );
};

const AnalysisTab = ({ socket }: { socket: Socket | null }) => {
  const [selectedTicker, setSelectedTicker] = useState('BBCA.JK');
  const [compareTicker, setCompareTicker] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [compareData, setCompareData] = useState<any>(null);
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [compareSentiment, setCompareSentiment] = useState<Sentiment | null>(null);
  const [fundamentals, setFundamentals] = useState<any>(null);
  const [compareFundamentals, setCompareFundamentals] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showFullFundamentals, setShowFullFundamentals] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [tickers, setTickers] = useState<string[]>([]);
  
  // Alert State
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [newThreshold, setNewThreshold] = useState('');
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');
  const [selectedIndicator, setSelectedIndicator] = useState<'macd' | 'rsi' | 'bb'>('macd');

  useEffect(() => {
    fetch('/api/lq45').then(res => res.json()).then(setTickers);
  }, []);

  const [compareSynthesis, setCompareSynthesis] = useState<string | null>(null);

  const fetchAnalysis = async (ticker: string, isCompare = false) => {
    if (isCompare) setCompareLoading(true);
    else setLoading(true);
    
    try {
      const [stockRes, fundRes] = await Promise.all([
        fetch(`/api/stock/${ticker}`),
        fetch(`/api/stock/${ticker}/fundamentals`)
      ]);
      const stockData = await stockRes.json();
      const fundData = await fundRes.json();

      // Extraction of noise words from ticker and name
      const tickerBase = ticker.split('.')[0].toLowerCase();
      const companyName = stockData.summary?.name || '';
      const companyNameParts = companyName.toLowerCase().split(/\s+/).filter((s: string) => s.length > 2);
      
      // Common business identifiers to always exclude from cloud
      const businessNoise = ['bank', 'central', 'asia', 'rakyat', 'indonesia', 'mandiri', 'negara', 'perusahaan', 'tbk', 'pt', 'perseroan', 'telekomunikasi', 'internasional'];
      const excludeThese = [tickerBase, ...companyNameParts, ...businessNoise];
      
      // Analyze sentiment based on CNN Indonesia News Stream
      let sentimentData: any = { score: 0.5, explanation: "Neutral news mood." };
      try {
        const streamRes = await fetch(`/api/news/${ticker}`); // Proxy endpoint for CNN news
        const streamRaw = await streamRes.json();
        
        if (streamRaw && !Array.isArray(streamRaw) && streamRaw.chatter) {
          // News articles from CNN
          const signals = streamRaw.chatter.map((c: any) => ({
            text: c.text,
            verdict: c.verdict,
            time: c.time,
            author: c.author
          }));
          
          const combinedMeta = streamRaw.chatter.map((c: any) => c.text).join(' ');
          sentimentData = getLexiconSentiment(combinedMeta, [], excludeThese);
          
          sentimentData.sentimentScore = streamRaw.sentimentScore;
          sentimentData.totalChatter = streamRaw.totalChatter;
          sentimentData.marketWindow = streamRaw.marketWindow;
          sentimentData.explanation = `CNN Pulse: Sentimen berita bisnis CNN Indonesia terdeteksi sebagai ${sentimentData.sentimentScore > 0.15 ? 'Optimis' : sentimentData.sentimentScore < -0.15 ? 'Pesimis' : 'Konsolidasi'}.`;
          sentimentData.signals = signals;
        } else {
          // Fallback logic for array of news items
          const openingTime = getIDXOpeningTimeUTC();
          
          let stream = Array.isArray(streamRaw) 
            ? streamRaw.filter((n: any) => n.providerPublishTime >= openingTime) 
            : [];
  
          // For the "Stream Pulse", prioritize recent social chatter if available
          if (stream && stream.length > 0) {
            const combinedMeta = stream.map((n: any) => `${n.title} ${n.description || ''} ${n.summary || ''}`).join(' ');
            sentimentData = getLexiconSentiment(combinedMeta, stream, excludeThese);
            sentimentData.explanation = `Session Pulse: ${sentimentData.explanation} (Current Market Stream)`;
          } else {
            // If no chatter in current session, go back further to catch historical social signals
            const yesterdayOpen = openingTime - 86400;
            stream = Array.isArray(streamRaw) 
              ? streamRaw.filter((n: any) => n.providerPublishTime >= yesterdayOpen) 
              : [];
            
            if (stream.length === 0) {
              stream = Array.isArray(streamRaw) ? streamRaw.slice(0, 20) : [];
            }
  
            if (stream.length > 0) {
              const combinedMeta = stream.map((n: any) => `${n.title} ${n.description || ''} ${n.summary || ''}`).join(' ');
              sentimentData = getLexiconSentiment(combinedMeta, stream, excludeThese);
              sentimentData.explanation = `Trend Pulse: ${sentimentData.explanation} (Aggregated Social Data)`;
            } else {
              sentimentData = getLexiconSentiment(companyName || ticker, [], excludeThese);
              sentimentData.explanation = "Awaiting live signals from public stream.";
            }
          }
        }
      } catch (err) {
        console.error("Sentiment calculation error:", err);
      }
      
      if (isCompare) {
        setCompareData(stockData);
        setCompareSentiment(sentimentData);
        setCompareFundamentals(fundData);
      } else {
        setData(stockData);
        setSentiment(sentimentData);
        setFundamentals(fundData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (isCompare) setCompareLoading(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    if (data && compareData && !loading && !compareLoading) {
      const generateSynthesis = () => {
        try {
          const sPe = data.summary.pe || 0;
          const cPe = compareData.summary.pe || 0;
          const lowerPeTicker = sPe < cPe ? selectedTicker : compareTicker;
          const higherPeTicker = sPe >= cPe ? selectedTicker : compareTicker;
          const peDifference = Math.abs(sPe - cPe).toFixed(1);
          
          const text = `Analisis Valuasi: ${selectedTicker} (P/E ${sPe.toFixed(1)}x) vs ${compareTicker} (P/E ${cPe.toFixed(1)}x). ${lowerPeTicker} menawarkan harga relatif lebih atraktif dengan selisih P/E ${peDifference}x dibanding ${higherPeTicker}. Dari sisi psikologi ritel, indeks sentimen ${selectedTicker} berada pada tingkat ${((sentiment?.score || 0) * 100).toFixed(0)}% sedangkan ${compareTicker} berkisar di ${((compareSentiment?.score || 0) * 100).toFixed(0)}%.`;
          setCompareSynthesis(text);
        } catch (err) {
          console.error("Synthesis generation error:", err);
          setCompareSynthesis("Perbandingan siap dianalisis.");
        }
      };
      generateSynthesis();
    } else {
      setCompareSynthesis(null);
    }
  }, [data, compareData, loading, compareLoading, selectedTicker, compareTicker]);

  useEffect(() => {
    fetchAnalysis(selectedTicker);
  }, [selectedTicker]);

  useEffect(() => {
    if (compareTicker) {
      fetchAnalysis(compareTicker, true);
    } else {
      setCompareData(null);
      setCompareSentiment(null);
    }
  }, [compareTicker]);

  const handleSetAlert = () => {
    if (!socket || !newThreshold) return;
    const alert: PriceAlert = {
      ticker: selectedTicker,
      threshold: Number(newThreshold),
      type: alertType
    };
    socket.emit('set-alert', alert);
    setAlerts([...alerts, alert]);
    setNewThreshold('');
  };

  const removeAlert = (ticker: string) => {
    if (!socket) return;
    socket.emit('remove-alert', ticker);
    setAlerts(alerts.filter(a => a.ticker !== ticker));
  };

  return (
    <div className="p-8 flex flex-col gap-8 h-full overflow-y-auto max-w-screen-2xl mx-auto w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Deep Analysis</h2>
          <p className="text-slate-400">Fundamental, Technical & Sentiment Triangulation</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">Primary Stock</span>
            <div className="flex gap-1 p-1 bg-glass rounded-xl border border-glass-border">
              {tickers.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTicker(t)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                    selectedTicker === t ? "bg-electric-cyan text-dark-bg" : "hover:bg-glass"
                  )}
                >
                  {t.split('.')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase ml-2">Compare With</span>
            <div className="flex items-center gap-2">
              <select 
                title="Select a stock to compare"
                value={compareTicker || ''} 
                onChange={(e) => setCompareTicker(e.target.value || null)}
                className="bg-glass border border-glass-border rounded-xl px-4 py-2 text-xs outline-none hover:border-deep-purple transition-colors cursor-pointer"
              >
                <option value="">No Comparison</option>
                {tickers.map(t => (
                  <option key={t} value={t} disabled={t === selectedTicker}>{t}</option>
                ))}
              </select>
              {compareTicker && (
                <button 
                  onClick={() => setCompareTicker(null)}
                  className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {(loading || (compareTicker && compareLoading)) ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-electric-cyan/20 border-t-electric-cyan rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium animate-pulse">Scanning Market Pulse...</p>
        </div>
      ) : data && (
        <div className="flex flex-col gap-8">
          {compareTicker && compareData ? (
            <div className="flex flex-col gap-8">
              {/* AI Comparison Synthesis */}
              <AnimatePresence>
                {compareSynthesis && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-6 border-deep-purple/30 bg-deep-purple/5 flex gap-4 items-center"
                  >
                    <div className="w-12 h-12 rounded-xl bg-deep-purple/20 flex items-center justify-center text-deep-purple pulse-glow shrink-0">
                      <Cpu size={24} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-deep-purple">AI Comparison Insight</h4>
                      <p className="text-sm font-medium text-slate-300 leading-relaxed italic">
                        {compareSynthesis}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Head-to-Head Summary */}
              <ComparisonSummaryTable 
                primary={data} 
                secondary={compareData} 
                pFundamentals={fundamentals} 
                sFundamentals={compareFundamentals} 
              />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Comparison Mode: Primary Stock */}
                <StockAnalysisColumn 
                  data={data} 
                  sentiment={sentiment} 
                  fundamentals={fundamentals}
                  isPrimary={true} 
                  indicator={selectedIndicator}
                  onIndicatorChange={setSelectedIndicator}
                />
                {/* Comparison Mode: Secondary Stock */}
                <StockAnalysisColumn 
                  data={compareData} 
                  sentiment={compareSentiment} 
                  fundamentals={compareFundamentals}
                  isPrimary={false} 
                  indicator={selectedIndicator}
                  onIndicatorChange={setSelectedIndicator}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Standard Mode view (Current existing UI) */}
              <div className="lg:col-span-2 flex flex-col gap-8">
                <PriceChartCard data={data} ticker={selectedTicker} sentiment={sentiment} />
                <CNNSentimentCard sentiment={sentiment} ticker={selectedTicker} />
                <IndicatorChartCard 
                  data={data} 
                  indicator={selectedIndicator} 
                  onChange={setSelectedIndicator} 
                />
                <AlertControlCard 
                  socket={socket} 
                  ticker={selectedTicker} 
                  alerts={alerts}
                  setAlerts={setAlerts}
                />
              </div>
              <div className="flex flex-col gap-6">
                <FundamentalPillar data={data.summary} fundamentals={fundamentals} />
                <TechnicalPillar data={data.summary} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const KeyRatiosBoard = ({ fundamentals, compareTicker }: any) => {
  const stats = fundamentals.defaultKeyStatistics || {};
  const finData = fundamentals.financialData || {};
  
  const formatVal = (val: any, isPercent = false, isCurrency = false) => {
    if (val === undefined || val === null) return 'N/A';
    const num = typeof val === 'object' ? val.raw : val;
    if (num === undefined || num === null || isNaN(num)) return 'N/A';
    
    if (isPercent) {
      // Handle values like 0.15 (15%) or 15.0 (15%)
      const displayNum = Math.abs(num) < 1 ? num * 100 : num;
      return `${displayNum.toFixed(2)}%`;
    }
    if (isCurrency) return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
    return num.toFixed(2);
  };

  const ratios = [
    { label: 'Profit Margin', value: formatVal(finData.profitMargins, true), desc: 'Net income as % of revenue' },
    { label: 'ROE', value: formatVal(finData.returnOnEquity, true), desc: 'Return on Equity' },
    { label: 'Current Ratio', value: formatVal(finData.currentRatio), desc: 'Liquidity health' },
    { label: 'EPS (Trailing)', value: formatVal(stats.trailingEps, false, true), desc: 'Earnings Per Share' },
    { label: 'EV/EBITDA', value: formatVal(finData.enterpriseToEbitda), desc: 'Enterprise Valuation' },
    { label: 'Dividend Yield', value: formatVal(fundamentals.summaryDetail?.dividendYield, true), desc: 'Annual payout' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {ratios.map((r, i) => (
        <div key={i} className="glass-panel p-4 flex flex-col gap-1 border-glass-border/30">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{r.label}</span>
          <span className="text-lg font-bold text-white">{r.value || 'N/A'}</span>
          <span className="text-[9px] text-slate-600 italic leading-tight">{r.desc}</span>
        </div>
      ))}
    </div>
  );
};

const FinancialStatementTable = ({ title, data, rows }: any) => {
  if (!data || data.length === 0) return null;

  const getValue = (period: any, key: string) => {
    // Try primary key, then check common Yahoo Finance variations
    const val = period[key] || 
                period[key.charAt(0).toUpperCase() + key.slice(1)] || 
                period[`total${key.charAt(0).toUpperCase() + key.slice(1)}`];
    
    if (typeof val === 'object' && val !== null && 'raw' in val) return val.raw;
    return val;
  };

  return (
    <div className="glass-panel overflow-hidden border-glass-border/50">
      <div className="p-4 bg-glass/20 border-b border-glass-border">
        <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-glass-border bg-glass/10">
              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Item</th>
              {data.map((period: any, i: number) => (
                <th key={i} className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">
                  {period.endDate ? new Date(period.endDate).getFullYear() : `Year ${i+1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, idx: number) => (
              <tr key={idx} className="border-b border-glass-border last:border-0 hover:bg-glass/5 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-300">{row.label}</td>
                {data.map((period: any, i: number) => {
                  const val = getValue(period, row.key);
                  return (
                    <td key={i} className="px-6 py-4 text-sm font-mono text-right text-slate-400">
                      {val !== undefined && val !== null ? `Rp ${(val / 1e9).toFixed(2)}B` : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Refactored Sub-components for Comparison Support ---

const ComparisonSummaryTable = ({ primary, secondary, pFundamentals, sFundamentals }: any) => {
  const getVal = (summary: any, funds: any, key: string) => {
    if (summary[key]) return summary[key];
    const stats = funds?.defaultKeyStatistics || {};
    const finData = funds?.financialData || {};
    
    if (key === 'pe') return stats.trailingPE?.raw || stats.forwardPE?.raw;
    if (key === 'pb') return stats.priceToBook?.raw || finData.priceToBook?.raw;
    if (key === 'der') return finData.debtToEquity?.raw;
    if (key === 'roe') return finData.returnOnEquity?.raw;
    if (key === 'margin') return finData.profitMargins?.raw;
    return null;
  };

  const getWinner = (p: any, s: any, lowerIsBetter = false) => {
    if (p === null || s === null || p === undefined || s === undefined) return null;
    if (typeof p === 'boolean' && typeof s === 'boolean') {
      if (p === s) return 'tie';
      return p ? 'p' : 's';
    }
    if (isNaN(p) || isNaN(s)) return null;
    if (p === s) return 'tie';
    if (lowerIsBetter) return p < s ? 'p' : 's';
    return p > s ? 'p' : 's';
  };

  const metrics = [
    { label: 'Current Price', p: primary.summary.price, s: secondary.summary.price, formatter: (v: number) => `Rp ${v?.toLocaleString('id-ID') || 0}` },
    { label: 'P/E Ratio', p: getVal(primary.summary, pFundamentals, 'pe'), s: getVal(secondary.summary, sFundamentals, 'pe'), formatter: (v: number) => v?.toFixed(2) || 'N/A', lowerIsBetter: true },
    { label: 'P/B Ratio', p: getVal(primary.summary, pFundamentals, 'pb'), s: getVal(secondary.summary, sFundamentals, 'pb'), formatter: (v: number) => v?.toFixed(2) || 'N/A', lowerIsBetter: true },
    { label: 'ROE', p: getVal(primary.summary, pFundamentals, 'roe'), s: getVal(secondary.summary, sFundamentals, 'roe'), formatter: (v: number) => v ? (v * 100).toFixed(2) + '%' : 'N/A' },
    { label: 'Profit Margin', p: getVal(primary.summary, pFundamentals, 'margin'), s: getVal(secondary.summary, sFundamentals, 'margin'), formatter: (v: number) => v ? (v * 100).toFixed(2) + '%' : 'N/A' },
    { label: 'RSI (14)', p: primary.summary.rsi, s: secondary.summary.rsi, formatter: (v: number) => v?.toFixed(2) || 'N/A', isRsi: true },
    { label: 'EMA Signal', p: primary.summary.isGoldenCross, s: secondary.summary.isGoldenCross, formatter: (v: boolean) => v ? 'GOLDEN' : 'NEUTRAL' },
  ];

  const getRsiColor = (val: number) => {
    if (val > 70) return 'text-red-400';
    if (val < 30) return 'text-neon-green';
    return 'text-white';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Activity className="text-electric-cyan" size={20} />
          Head-to-Head Comparison
        </h3>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
          Side-by-Side Analysis
        </span>
      </div>

      <div className="glass-panel overflow-hidden border-glass-border/50">
        <div className="grid grid-cols-7 bg-slate-900/80 border-b border-glass-border items-center">
          <div className="col-span-3 p-6 text-xs font-bold uppercase tracking-widest text-slate-500">Metric</div>
          <div className="col-span-2 p-6 text-center border-l border-glass-border">
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-black text-electric-cyan tracking-tighter">{primary.summary.symbol}</span>
              <span className="text-[8px] text-slate-500 uppercase">Primary Asset</span>
            </div>
          </div>
          <div className="col-span-2 p-6 text-center border-l border-glass-border">
            <div className="flex flex-col items-center gap-1">
              <span className="text-base font-black text-deep-purple tracking-tighter">{secondary.summary.symbol}</span>
              <span className="text-[8px] text-slate-500 uppercase">Comparison Target</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col">
          {metrics.map((m) => {
            const winner = getWinner(m.p, m.s, m.lowerIsBetter);
            return (
              <div key={m.label} className="grid grid-cols-7 border-b border-glass-border last:border-0 group transition-all duration-300">
                <div className="col-span-3 p-4 pl-8 text-sm font-medium text-slate-400 group-hover:text-white transition-colors flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-electric-cyan transition-colors" />
                  {m.label}
                </div>
                
                <div className={cn(
                  "col-span-2 p-4 text-center border-l border-glass-border flex flex-col items-center justify-center gap-1",
                  winner === 'p' ? "bg-neon-green/5" : "bg-transparent"
                )}>
                  <span className={cn(
                    "text-sm font-bold transition-all",
                    m.isRsi ? getRsiColor(m.p) : (winner === 'p' ? "text-neon-green" : "text-slate-300")
                  )}>
                    {(m.formatter as any)(m.p)}
                  </span>
                  {winner === 'p' && !m.isRsi && (
                    <span className="text-[8px] font-black uppercase text-neon-green bg-neon-green/10 px-1.5 py-0.5 rounded border border-neon-green/20">Better Value</span>
                  )}
                  {m.isRsi && m.p < 30 && <span className="text-[8px] font-black uppercase text-neon-green">Oversold</span>}
                  {m.isRsi && m.p > 70 && <span className="text-[8px] font-black uppercase text-red-500">Overbought</span>}
                </div>

                <div className={cn(
                  "col-span-2 p-4 text-center border-l border-glass-border flex flex-col items-center justify-center gap-1",
                  winner === 's' ? "bg-neon-green/5" : "bg-transparent"
                )}>
                  <span className={cn(
                    "text-sm font-bold transition-all",
                    m.isRsi ? getRsiColor(m.s) : (winner === 's' ? "text-neon-green" : "text-slate-300")
                  )}>
                    {(m.formatter as any)(m.s)}
                  </span>
                  {winner === 's' && !m.isRsi && (
                    <span className="text-[8px] font-black uppercase text-neon-green bg-neon-green/10 px-1.5 py-0.5 rounded border border-neon-green/20">Better Value</span>
                  )}
                  {m.isRsi && m.s < 30 && <span className="text-[8px] font-black uppercase text-neon-green">Oversold</span>}
                  {m.isRsi && m.s > 70 && <span className="text-[8px] font-black uppercase text-red-500">Overbought</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PriceChartCard = ({ data, ticker, sentiment, height = "500px" }: { data: any, ticker: string, sentiment?: any, height?: string }) => {
  const chartData = data.history.map((h: any) => ({
    ...h,
    wick: [h.low, h.high],
    body: [h.open, h.close],
    isUp: h.close >= h.open,
    color: h.close >= h.open ? '#10B981' : '#F87171' // neon-green : red-400
  }));

  return (
    <div className="glass-panel p-8 flex flex-col gap-6" style={{ height }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            {data.summary.name} 
            <span className="text-sm font-mono text-electric-cyan px-2 py-0.5 bg-electric-cyan/10 rounded">
              {data.summary.symbol}
            </span>
            {sentiment && (
              <div className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-lg transition-all",
                sentiment.sentimentScore > 0.6 ? "bg-[#00FF85]/20 text-[#00FF85] border-[#00FF85]/40 shadow-[#00FF85]/20" :
                sentiment.sentimentScore > 0.2 ? "bg-[#00FF85]/10 text-[#00FF85] border-[#00FF85]/20 shadow-[#00FF85]/10" :
                sentiment.sentimentScore < -0.6 ? "bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40 shadow-[#EF4444]/20" :
                sentiment.sentimentScore < -0.2 ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20 shadow-[#EF4444]/10" :
                "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 shadow-[#F59E0B]/5"
              )}>
                {sentiment.sentimentScore > 0.6 ? 'STRONG BUY' : 
                 sentiment.sentimentScore > 0.2 ? 'BUY' : 
                 sentiment.sentimentScore < -0.6 ? 'STRONG SELL' : 
                 sentiment.sentimentScore < -0.2 ? 'SELL' : 'HOLD'}
              </div>
            )}
          </h3>
          <p className="text-sm text-slate-400">Real-time Candlestick Analysis</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">Rp {data.summary.price.toLocaleString('id-ID')}</p>
          <p className={cn(
            "text-sm font-medium",
            data.summary.change > 0 ? "text-neon-green" : "text-red-400"
          )}>
            {data.summary.change > 0 ? '+' : ''}{data.summary.change?.toFixed(2) || '0.00'}%
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(d) => new Date(d).toLocaleDateString()} 
              stroke="#ffffff30"
              fontSize={10}
            />
            <YAxis domain={['auto', 'auto']} stroke="#ffffff30" fontSize={10} />
            <Tooltip 
              content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="glass-panel p-4 border border-white/10 shadow-2xl backdrop-blur-xl">
                      <p className="text-[10px] text-slate-500 mb-2 uppercase font-black tracking-widest">{new Date(d.date).toLocaleDateString()}</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 uppercase font-bold">Open</span>
                          <span className="text-xs font-mono text-white">Rp {d.open?.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 uppercase font-bold">Close</span>
                          <span className="text-xs font-mono text-white">Rp {d.close?.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 uppercase font-bold text-neon-green">High</span>
                          <span className="text-xs font-mono text-neon-green">Rp {d.high?.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-500 uppercase font-bold text-red-400">Low</span>
                          <span className="text-xs font-mono text-red-400">Rp {d.low?.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Wick */}
            <Bar dataKey="wick" barSize={2} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-wick-${index}`} fill={entry.color} fillOpacity={0.3} />
              ))}
            </Bar>
            {/* Body */}
            <Bar dataKey="body" barSize={8} isAnimationActive={true}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-body-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const IndicatorChartCard = ({ data, indicator, onChange }: { data: any, indicator: string, onChange: (i: any) => void }) => (
  <div className="glass-panel p-8 flex flex-col gap-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Activity className="text-deep-purple" size={20} />
          Technical Labs
        </h3>
        <div className="flex gap-1 p-1 bg-glass rounded-lg border border-glass-border ml-4">
          {(['macd', 'rsi', 'bb'] as const).map((ind) => (
            <button
              key={ind}
              onClick={() => onChange(ind)}
              className={cn(
                "px-3 py-1 rounded text-[10px] font-bold uppercase transition-all",
                indicator === ind ? "bg-deep-purple text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Deep Signal Analysis</p>
    </div>

    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data.history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickFormatter={(d) => new Date(d).toLocaleDateString()} 
            stroke="#ffffff30"
            fontSize={10}
          />
          <YAxis stroke="#ffffff30" fontSize={10} domain={['auto', 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0D1117', border: '1px solid #ffffff10', borderRadius: '12px' }}
            itemStyle={{ fontSize: '10px' }}
          />
          
          {indicator === 'macd' && (
            <>
              <Bar dataKey="macd.histogram" fill="#ffffff20" name="Histogram" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="macd.MACD" stroke="#00F2FF" dot={false} strokeWidth={2} name="MACD" />
              <Line type="monotone" dataKey="macd.signal" stroke="#7000FF" dot={false} strokeWidth={2} name="Signal" />
            </>
          )}

          {indicator === 'rsi' && (
            <>
              <Line type="monotone" dataKey="rsi" stroke="#00FF85" dot={false} strokeWidth={2} name="RSI" />
              <Line strokeDasharray="5 5" dataKey={() => 70} stroke="#ff4d4d" dot={false} strokeWidth={1} name="Overbought" />
              <Line strokeDasharray="5 5" dataKey={() => 30} stroke="#00FF85" dot={false} strokeWidth={1} name="Oversold" />
            </>
          )}

          {indicator === 'bb' && (
             <>
              <Line type="monotone" dataKey="close" stroke="#ffffff30" dot={false} strokeWidth={1} name="Price" />
              <Line type="monotone" dataKey="bb.upper" stroke="#7000FF" dot={false} strokeWidth={1} name="Upper Band" />
              <Line type="monotone" dataKey="bb.middle" stroke="#00F2FF" dot={false} strokeWidth={1} name="Middle" />
               <Line type="monotone" dataKey="bb.lower" stroke="#7000FF" dot={false} strokeWidth={1} name="Lower Band" />
             </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const FundamentalPillar = ({ data, fundamentals }: { data: any, fundamentals?: any }) => {
  const stats = fundamentals?.defaultKeyStatistics || {};
  const finData = fundamentals?.financialData || {};
  
  const pe = data.pe || stats.trailingPE?.raw || stats.forwardPE?.raw;
  const pb = data.pb || stats.priceToBook?.raw || finData.priceToBook?.raw;
  let der = data.der || finData.debtToEquity?.raw;
  
  // Normalize DER if it is in decimal form (e.g. 1.25 -> 125)
  if (der !== undefined && der !== null && der < 10) der = der * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "glass-panel p-6 flex flex-col gap-4 transition-all duration-500",
        data.isUndervalued && "border-neon-green/30 neon-glow-green"
      )}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Fundamental</h4>
        <div className={cn(
          "p-1.5 rounded text-xs font-bold",
          data.isUndervalued ? "bg-neon-green/20 text-neon-green" : "bg-slate-700/50 text-slate-400"
        )}>
          {data.isUndervalued ? "UNDERVALUED" : "FAIR VALUE"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">PER Ratio</p>
          <p className="text-lg font-bold">{pe ? pe.toFixed(2) : 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">PBV Ratio</p>
          <p className="text-lg font-bold">{pb ? pb.toFixed(2) : 'N/A'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-slate-500">Debt to Equity</p>
          <p className="text-lg font-bold">{der ? der.toFixed(2) : '0.00'}</p>
        </div>
      </div>
    </motion.div>
  );
};

const TechnicalPillar = ({ data }: { data: any }) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.1 }}
    whileHover={{ scale: 1.02, y: -2 }}
    className={cn(
      "glass-panel p-6 flex flex-col gap-4",
      data.isGoldenCross && "border-electric-cyan/30 neon-glow-cyan"
    )}
  >
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-bold tracking-widest text-slate-400 uppercase">Technical</h4>
      {data.isGoldenCross && (
        <div className="bg-electric-cyan/20 text-electric-cyan p-1.5 rounded text-xs font-bold flex items-center gap-1 pulse-glow">
          <TrendingUp size={12} /> GOLDEN CROSS
        </div>
      )}
    </div>
    <div className="flex flex-col gap-3">
       <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">RSI (14)</span>
          <span className={cn(
            "text-sm font-bold",
            data.rsi > 70 ? "text-red-400" : data.rsi < 30 ? "text-neon-green" : "text-white"
          )}>{data.rsi?.toFixed(2) || '0.00'}</span>
       </div>
       <div className="w-full bg-glass h-1.5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${data.rsi}%` }}
            className="h-full bg-gradient-to-r from-neon-green via-electric-cyan to-deep-purple"
          />
       </div>
       <div className="flex items-center justify-between mt-2 pt-2 border-t border-glass-border">
          <span className="text-xs text-slate-400">EMA 50/200</span>
          <span className="text-xs font-mono text-slate-300">
            {data.ema50?.toFixed(0) || '0'} / {data.ema200?.toFixed(0) || '0'}
          </span>
       </div>
    </div>
  </motion.div>
);

const WordCloud = ({ words, colorClass }: { words: { text: string, weight: number }[], colorClass: string }) => {
  if (words.length === 0) return <span className="text-[10px] text-slate-600 font-medium italic opacity-50">No catalyst detected</span>;
  
  const maxWeight = Math.max(...words.map(w => w.weight));
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 max-w-full">
      {words.map(({ text, weight }, i) => {
        const sizeRatio = maxWeight > 0 ? weight / maxWeight : 1;
        const fontSize = 10 + (sizeRatio * 8); // 10px to 18px
        const opacity = 0.4 + (sizeRatio * 0.6);
        
        return (
          <motion.span
            key={`${text}-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
            className={cn(
              "font-black tracking-tighter whitespace-nowrap drop-shadow-sm px-2 py-0.5 rounded-lg border border-transparent hover:border-current transition-all cursor-default",
              colorClass
            )}
            style={{ fontSize: `${fontSize}px` }}
          >
            {text.toUpperCase()}
          </motion.span>
        );
      })}
    </div>
  );
};

const AlertControlCard = ({ socket, ticker, alerts, setAlerts }: { socket: Socket | null, ticker: string, alerts: any[], setAlerts: any }) => {
  const [newThreshold, setNewThreshold] = useState('');
  const [alertType, setAlertType] = useState<'above' | 'below'>('above');

  const [isSetting, setIsSetting] = useState(false);

  const handleSetAlert = async () => {
    if (!socket || !newThreshold) return;
    setIsSetting(true);
    const alert: PriceAlert = { ticker, threshold: Number(newThreshold), type: alertType };
    socket.emit('set-alert', alert);
    setAlerts((prev: PriceAlert[]) => [...prev, alert]);
    setNewThreshold('');
    
    setTimeout(() => setIsSetting(false), 2000);
  };

  const removeAlert = (type: string) => {
    if (!socket) return;
    socket.emit('remove-alert', ticker);
    setAlerts((prev: PriceAlert[]) => prev.filter((a: PriceAlert) => a.ticker !== ticker));
  };

  return (
    <div className="glass-panel p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Bell className="text-electric-cyan" size={20} />
          Price Alerts
        </h3>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Real-time triggers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Target Price (IDR)</label>
            <input 
              type="number"
              placeholder="e.g. 11000"
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
              className="bg-dark-bg border border-glass-border rounded-xl px-4 py-3 outline-none focus:border-electric-cyan transition-colors font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setAlertType('above')}
              className={cn(
                "flex-1 py-3 rounded-xl border text-sm font-bold transition-all",
                alertType === 'above' ? "bg-electric-cyan/20 border-electric-cyan text-electric-cyan" : "border-glass-border text-slate-400"
              )}
            >
              Price Above
            </button>
            <button 
              onClick={() => setAlertType('below')}
              className={cn(
                "flex-1 py-3 rounded-xl border text-sm font-bold transition-all",
                alertType === 'below' ? "bg-red-500/10 border-red-500/30 text-red-400" : "border-glass-border text-slate-400"
              )}
            >
              Price Below
            </button>
          </div>
          <button 
            onClick={handleSetAlert}
            className={cn(
              "w-full py-4 font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              isSetting ? "bg-neon-green text-dark-bg" : "bg-electric-cyan text-dark-bg hover:neon-glow-cyan"
            )}
          >
            {isSetting ? <TrendingUp size={20} className="animate-bounce" /> : <Plus size={20} />}
            {isSetting ? "ALERT ACTIVE!" : "SET SMART ALERT"}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-xs font-bold text-slate-500 uppercase">Active Monitors</label>
          <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-2">
            {alerts.filter(a => a.ticker === ticker).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-glass-border rounded-xl bg-glass/5">
                <Bell size={24} className="text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">No active alerts for this ticker</p>
              </div>
            ) : (
              alerts.filter(a => a.ticker === ticker).map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-glass border border-glass-border rounded-xl group hover:border-electric-cyan/50 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{a.ticker}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                      {a.type} Rp {a.threshold.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <button 
                    onClick={() => removeAlert(a.ticker)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StockAnalysisColumn = ({ data, sentiment, fundamentals, isPrimary, indicator, onIndicatorChange }: any) => (
  <div className="flex flex-col gap-6">
    <div className={cn(
      "glass-panel p-5 flex items-center justify-between group overflow-hidden relative",
      isPrimary ? "border-electric-cyan/30" : "border-deep-purple/30"
    )}>
      {/* Decorative accent */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1",
        isPrimary ? "bg-electric-cyan" : "bg-deep-purple"
      )} />
      
      <div className="flex flex-col gap-1">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-[0.2em]",
          isPrimary ? "text-electric-cyan" : "text-deep-purple"
        )}>
          {isPrimary ? "Primary Asset" : "Comparison Asset"}
        </span>
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-black tracking-tighter uppercase">{data.summary.symbol}</h3>
        </div>
      </div>
      
      <div className={cn(
          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase",
          isPrimary ? "bg-electric-cyan/10 text-electric-cyan" : "bg-deep-purple/10 text-deep-purple"
      )}>
        {isPrimary ? "Focus" : "Target"}
      </div>
    </div>
    
    <PriceChartCard data={data} ticker={data.summary.symbol} sentiment={sentiment} height="350px" />
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
       <FundamentalPillar data={data.summary} fundamentals={fundamentals} />
       <TechnicalPillar data={data.summary} />
    </div>
    
    <IndicatorChartCard data={data} indicator={indicator} onChange={onIndicatorChange} />
  </div>
);

const StockScreener = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    peMax: 30,
    pbMax: 3,
    roeMin: 5,
    rsiMax: 70,
    rsiMin: 30,
    onlyGoldenCross: false
  });
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const fetchScreenerData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/screener');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Screener fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenerData();
  }, []);

  const filteredData = data.filter(item => {
    if (item.pe > filters.peMax) return false;
    if (item.pb > filters.pbMax) return false;
    if (item.roe < filters.roeMin) return false;
    if (item.rsi > filters.rsiMax || item.rsi < filters.rsiMin) return false;
    if (filters.onlyGoldenCross && !item.isGoldenCross) return false;
    return true;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = a[key];
    const bVal = b[key];
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="p-8 flex flex-col gap-8 max-w-screen-2xl mx-auto w-full h-full overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">LQ45 Screener</h2>
        <p className="text-slate-400">Filter Indonesian Blue-chip stocks by technical & fundamental signals</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filter Controls */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-panel p-6 flex flex-col gap-6 border-electric-cyan/20 sticky top-28">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-electric-cyan" />
              <h4 className="text-sm font-bold uppercase tracking-widest text-white">Advanced Filters</h4>
            </div>

            <div className="flex flex-col gap-6">
              {/* Fundamental Filters */}
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fundamentals</span>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Max P/E Ratio</label>
                    <span className="font-mono text-xs text-electric-cyan">{filters.peMax}x</span>
                  </div>
                  <input 
                    type="range" min="5" max="100" step="1" 
                    value={filters.peMax} 
                    onChange={(e) => setFilters(f => ({ ...f, peMax: Number(e.target.value) }))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-electric-cyan"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Max P/B Ratio</label>
                    <span className="font-mono text-xs text-electric-cyan">{filters.pbMax}x</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="10" step="0.1" 
                    value={filters.pbMax} 
                    onChange={(e) => setFilters(f => ({ ...f, pbMax: Number(e.target.value) }))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-electric-cyan"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Min ROE (%)</label>
                    <span className="font-mono text-xs text-electric-cyan">{filters.roeMin}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="40" step="1" 
                    value={filters.roeMin} 
                    onChange={(e) => setFilters(f => ({ ...f, roeMin: Number(e.target.value) }))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-electric-cyan"
                  />
                </div>
              </div>

              {/* Technical Filters */}
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Technicals</span>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">RSI Zone</label>
                    <span className="font-mono text-xs text-electric-cyan">{filters.rsiMin}-{filters.rsiMax}</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={filters.rsiMin}
                      onChange={(e) => setFilters(f => ({ ...f, rsiMin: Number(e.target.value) }))}
                      className="w-1/2 bg-slate-900 border border-glass-border px-2 py-1 text-xs rounded"
                      placeholder="Min"
                    />
                    <input 
                      type="number" 
                      value={filters.rsiMax}
                      onChange={(e) => setFilters(f => ({ ...f, rsiMax: Number(e.target.value) }))}
                      className="w-1/2 bg-slate-900 border border-glass-border px-2 py-1 text-xs rounded"
                      placeholder="Max"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => setFilters(f => ({ ...f, onlyGoldenCross: !f.onlyGoldenCross }))}
                  className={cn(
                    "w-full py-2 px-4 rounded-lg text-xs font-bold border transition-all flex items-center justify-between",
                    filters.onlyGoldenCross 
                      ? "bg-electric-cyan/20 border-electric-cyan text-electric-cyan" 
                      : "bg-slate-900 border-slate-800 text-slate-500"
                  )}
                >
                  Golden Cross Only
                  {filters.onlyGoldenCross && <Activity size={14} className="animate-pulse" />}
                </button>
              </div>

              <button 
                onClick={fetchScreenerData}
                disabled={loading}
                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <ArrowUpDown size={14} />
                REFRESH DATA
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {loading ? (
            <div className="glass-panel h-[600px] flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-electric-cyan/20 border-t-electric-cyan rounded-full animate-spin"></div>
              <p className="text-slate-400 animate-pulse font-medium">Scanning Market DNA...</p>
            </div>
          ) : (
            <div className="glass-panel overflow-hidden border-slate-800">
              <div className="px-6 py-4 border-b border-glass-border flex items-center justify-between bg-slate-900/50">
                <span className="text-xs font-bold text-slate-400">Found {sortedData.length} stocks matching your DNA profile</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border">
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('ticker')}>Ticker</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('price')}>Price</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('pe')}>P/E</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('pb')}>P/B</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('roe')}>ROE %</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 cursor-pointer hover:text-white transition-colors text-right" onClick={() => handleSort('rsi')}>RSI</th>
                      <th className="px-6 py-4 text-[10px] uppercase font-bold text-slate-500 text-center">Signals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((item, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        key={item.symbol} 
                        className="border-b border-glass-border hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-electric-cyan tracking-tight">{item.ticker}</span>
                            <span className={cn("text-[10px] font-bold", item.change > 0 ? "text-neon-green" : "text-red-400")}>
                                {item.change > 0 ? '+' : ''}{item.change.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">Rp {item.price.toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-right font-mono text-xs">{item.pe.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-mono text-xs">{item.pb.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right font-mono text-xs text-neon-green">{item.roe.toFixed(2)}%</td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "font-mono text-xs px-2 py-0.5 rounded",
                            item.rsi < 30 ? "bg-neon-green/20 text-neon-green" : 
                            item.rsi > 70 ? "bg-red-500/20 text-red-400" : "text-slate-400"
                          )}>
                            {item.rsi.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                             {item.isGoldenCross && (
                               <div title="Golden Cross" className="w-5 h-5 bg-electric-cyan/20 rounded flex items-center justify-center text-electric-cyan">
                                 <Activity size={12} />
                               </div>
                             )}
                             {item.pe < 15 && item.pb < 1.5 && (
                               <div title="Undervalued" className="w-5 h-5 bg-neon-green/20 rounded flex items-center justify-center text-neon-green">
                                 <TrendingUp size={12} />
                               </div>
                             )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    {sortedData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">No stocks matching these criteria. Try loosening your filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PortfolioTab = () => {
  const [budget, setBudget] = useState(10000000);
  const [riskProfile, setRiskProfile] = useState<'Low'|'Medium'|'High'>('Medium');
  const [allocation, setAllocation] = useState<any[]>([]);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableTickers, setAvailableTickers] = useState<string[]>([]);
  const [selectedTickers, setSelectedTickers] = useState<string[]>(["BBCA.JK", "BBRI.JK", "TLKM.JK", "BMRI.JK", "ASII.JK"]);
  const [rfRate, setRfRate] = useState(0.0625);
  const [txFees, setTxFees] = useState(0.0020);
  const [planningSynthesis, setPlanningSynthesis] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/lq45').then(res => res.json()).then(setAvailableTickers);
  }, []);

  const calculatePlanning = async () => {
    if (budget <= 0) {
      setError("Masukkan budget investasi Anda terlebih dahulu.");
      return;
    }

    if (selectedTickers.length < 2) {
      setError("Pilih minimal 2 saham untuk optimasi portofolio.");
      return;
    }
    
    setIsOptimizing(true);
    setError(null);
    setPlanningSynthesis(null);

    try {
      const res = await fetch('/api/portfolio/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          budget, 
          riskProfile, 
          tickers: selectedTickers, 
          rfRate,
          fees: txFees
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menghubungi server");
      }
      const { allocation: optimizedAllocation, simulations, stats } = await res.json();
      
      // Inject dummy but plausible Buy/Sell/Hold signals for the portfolio items
      const enhancedAllocation = optimizedAllocation.map((item: any) => {
        // Simple logic: if weight > 20% it's a BUY, if < 5% it's maybe HOLD/SELL
        let action = 'HOLD';
        let actionColor = 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        
        if (item.weight > 15) {
          action = 'BUY';
          actionColor = 'text-neon-green bg-neon-green/10 border-neon-green/20';
        } else if (item.weight < 5) {
          action = 'SELL';
          actionColor = 'text-red-500 bg-red-500/10 border-red-500/20';
        }
        
        return { ...item, action, actionColor };
      });

      setAllocation(enhancedAllocation);
      setSimulationData({ simulations, stats });

      if (enhancedAllocation.length > 0) {
        const topSaham = enhancedAllocation.slice(0, 3).map((a: any) => `${a.ticker.split('.')[0]} (${a.weight.toFixed(1)}%)`).join(', ');
        const totalCapital = enhancedAllocation.reduce((sum, item) => sum + item.totalRequired, 0);
        const text = `Model optimasi Markowitz berhasil merekomendasikan alokasi utama pada ${topSaham} dengan tingkat risiko ${riskProfile}. Total alokasi modal sebesar Rp ${totalCapital.toLocaleString('id-ID')} dengan ekspektasi tingkat imbal hasil (expected return) sebesar ${stats.expectedReturn.toFixed(2)}% per tahun dan Sharpe Ratio ${stats.sharpeRatio.toFixed(2)}.`;
        setPlanningSynthesis(text);
      } else {
        setPlanningSynthesis("Simulasi selesai.");
      }

    } catch (err: any) {
      console.error("Optimization failed:", err);
      setError(err.message || "Failed to run simulation");
    } finally {
      setIsOptimizing(false);
    }
  };

  const toggleTicker = (ticker: string) => {
    if (selectedTickers.includes(ticker)) {
      if (selectedTickers.length > 2) {
        setSelectedTickers(selectedTickers.filter(t => t !== ticker));
      }
    } else {
      if (selectedTickers.length < 12) {
        setSelectedTickers([...selectedTickers, ticker]);
      }
    }
  };

  return (
    <div className="p-8 flex flex-col gap-8 max-w-6xl mx-auto w-full h-full overflow-y-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Portfolio Planner</h2>
        </div>
        <p className="text-slate-400">Budget Optimization & Lot Calculator</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-panel p-6 flex flex-col gap-6 border-electric-cyan/20">
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Investment Budget</h4>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <input 
                  type="number" 
                  value={budget}
                  onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-dark-bg border border-glass-border rounded-xl px-4 py-4 outline-none focus:border-electric-cyan transition-colors font-mono text-2xl text-electric-cyan"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">IDR</span>
              </div>
              <p className="text-[10px] text-slate-500">Auto-calculated optimization</p>
            </div>
            <button 
              onClick={calculatePlanning}
              disabled={isOptimizing}
              className={cn(
                "mt-2 w-full py-4 text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2",
                isOptimizing ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-electric-cyan text-dark-bg hover:neon-glow-cyan hover:scale-[1.02] active:scale-95"
              )}
            >
              {isOptimizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-dark-bg/20 border-t-dark-bg rounded-full animate-spin"></div>
                  OPTIMIZING...
                </>
              ) : "RUN OPTIMIZER"}
            </button>
            {error && (
              <p className="mt-2 text-xs text-red-500 font-medium bg-red-500/10 p-2 rounded border border-red-500/20">
                {error}
              </p>
            )}
          </div>
          
          <div className="glass-panel p-6 flex flex-col gap-4 bg-deep-purple/5">
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400 text-deep-purple">Risk Profile</h4>
            <div className="flex gap-2">
              {(['Low', 'Medium', 'High'] as const).map(r => (
                <button 
                  key={r} 
                  onClick={() => setRiskProfile(r)}
                  className={cn(
                    "flex-1 py-2 rounded text-xs font-bold border transition-all",
                    riskProfile === r 
                      ? "bg-deep-purple text-white border-deep-purple neon-glow-purple" 
                      : "bg-transparent text-slate-400 border-glass-border hover:border-slate-500"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-widest text-slate-400">Target Universe</h4>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{selectedTickers.length} / 12 Selected</span>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-2">
              <button 
                onClick={() => setSelectedTickers(["BBCA.JK", "BBRI.JK", "BMRI.JK", "BBNI.JK"])}
                className="text-[9px] font-bold px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/20 transition-colors"
              >
                BIG BANKS
              </button>
              <button 
                onClick={() => setSelectedTickers(["GOTO.JK", "BUKA.JK", "TLKM.JK"])}
                className="text-[9px] font-bold px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded hover:bg-cyan-500/20 transition-colors"
              >
                TOP TECH
              </button>
              <button 
                onClick={() => setSelectedTickers(["ICBP.JK", "UNVR.JK", "AMRT.JK", "INDF.JK"])}
                className="text-[9px] font-bold px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded hover:bg-green-500/20 transition-colors"
              >
                CONSUMER
              </button>
              <button 
                onClick={() => setSelectedTickers(["TLKM.JK", "ASII.JK", "UNVR.JK", "ICBP.JK"])}
                className="text-[9px] font-bold px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded hover:bg-purple-500/20 transition-colors"
              >
                BLUECHIPS
              </button>
              <button 
                onClick={() => setSelectedTickers([])}
                className="text-[9px] font-bold px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors"
                disabled={selectedTickers.length === 0}
              >
                CLEAR
              </button>
            </div>

            <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto pr-2 pb-2 custom-scrollbar">
              {availableTickers.map(ticker => {
                const isSelected = selectedTickers.includes(ticker);
                return (
                  <button
                    key={ticker}
                    onClick={() => toggleTicker(ticker)}
                    className={cn(
                      "group relative px-3 py-2 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-2",
                      isSelected
                        ? "bg-electric-cyan/10 border-electric-cyan text-electric-cyan neon-glow-cyan/20"
                        : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600"
                    )}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-electric-cyan animate-pulse"></div>}
                    {ticker.split('.')[0]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-6">
          {isOptimizing ? (
            <div className="glass-panel h-[400px] flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-deep-purple/20 border-t-deep-purple rounded-full animate-spin"></div>
              <p className="text-slate-400 animate-pulse font-medium">Running Markowitz Simulation...</p>
              <p className="text-[10px] text-slate-500 italic">Analyzing historical covariance & expected returns</p>
            </div>
          ) : allocation.length > 0 ? (
            <>
              {planningSynthesis && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-panel p-4 bg-deep-purple/10 border-deep-purple/30 flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-deep-purple/20 flex items-center justify-center text-deep-purple shrink-0">
                    <Cpu size={20} />
                  </div>
                  <p className="text-xs font-medium text-slate-300 italic">"{planningSynthesis}"</p>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 bg-neon-green/5 border-neon-green/20">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Total Allocated</p>
                  <p className="text-xl font-bold text-neon-green">
                    Rp {allocation.reduce((sum, item) => sum + item.totalRequired, 0).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="glass-panel p-4 bg-electric-cyan/5 border-electric-cyan/20">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Remaining Cash</p>
                  <p className="text-xl font-bold text-electric-cyan">
                    Rp {(budget - allocation.reduce((sum, item) => sum + item.totalRequired, 0)).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="glass-panel p-4 bg-deep-purple/5 border-deep-purple/20">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Diversification</p>
                  <p className="text-xl font-bold text-deep-purple">{allocation.length} Stocks</p>
                </div>
              </div>

              {simulationData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-panel p-6 border-slate-800">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-widest text-slate-300">Markowitz Efficient Frontier</h4>
                        <p className="text-[10px] text-slate-500">Risk vs. Return Monte Carlo Simulation</p>
                      </div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis 
                            type="number" 
                            dataKey="volatility" 
                            name="Volatility" 
                            unit="%" 
                            stroke="#64748b" 
                            fontSize={10}
                          />
                          <YAxis 
                            type="number" 
                            dataKey="return" 
                            name="Return" 
                            unit="%" 
                            stroke="#64748b" 
                            fontSize={10}
                          />
                          <ZAxis type="number" range={[20, 20]} />
                          <Tooltip 
                            cursor={{ strokeDasharray: '3 3' }} 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(value: any) => [`${value.toFixed(2)}%`]}
                          />
                          <Scatter name="Portfolios" data={simulationData.simulations} fill="#334155" opacity={0.5} />
                          <Scatter name="Optimal" data={[{ return: simulationData.stats.expectedReturn, volatility: simulationData.stats.volatility }]} fill="#06b6d4">
                            <Cell fill="#06b6d4" stroke="#06b6d4" strokeWidth={5} />
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="glass-panel p-5 bg-electric-cyan/10 border-electric-cyan/20 flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-4">
                        <Target className="text-electric-cyan" size={16} />
                        <h5 className="text-[10px] font-bold text-electric-cyan uppercase tracking-widest">Portfolio Analytics</h5>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Expected Return (Est.)</p>
                          <p className="text-2xl font-bold text-white">{(simulationData.stats.expectedReturn).toFixed(2)}% <span className="text-xs text-slate-500 font-normal">/ Year</span></p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Portfolio Risk (Peak Vol)</p>
                          <p className="text-2xl font-bold text-white">{(simulationData.stats.volatility).toFixed(2)}%</p>
                        </div>
                        <div className="pt-4 border-t border-slate-800">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Sharpe Ratio</p>
                            <span className="text-xs font-mono font-bold text-neon-green">{simulationData.stats.sharpeRatio.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-panel overflow-hidden border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-glass-border bg-slate-900/50">
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Ticker</th>
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Target Weight</th>
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Verdict</th>
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold text-center">Lots</th>
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold text-right">Value Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocation.map((item, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={item.ticker} 
                        className="border-b border-glass-border hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm tracking-tight">{item.ticker.split('.')[0]}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-[11px] font-mono font-medium text-slate-400">{item.weight}%</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold border",
                            item.actionColor
                          )}>
                            {item.action}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="font-bold text-electric-cyan text-sm">{item.lots}</span>
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-neon-green">
                          Rp {item.totalRequired.toLocaleString('id-ID')}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="glass-panel h-[400px] flex flex-col items-center justify-center text-center p-8 gap-6 border-dashed border-slate-800">
              <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center text-slate-700 animate-pulse">
                <PieChart size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-300">Awaiting Simulation</h3>
              <p className="text-slate-500 text-sm max-w-sm">
                Input your total investment budget to see how to optimally distribute your capital across LQ45 blue-chip stocks.
              </p>
              <button 
                onClick={calculatePlanning}
                className="px-8 py-3 bg-electric-cyan text-dark-bg rounded-xl font-bold transition-all hover:neon-glow-cyan"
              >
                RUN OPTIMIZER
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  providerPublishTime: number;
  sentiment: {
    score: number;
    status: string;
  };
}

const OverviewTab = () => {
  const [loading, setLoading] = useState(true);
  const [ihsg, setIhsg] = useState<{ price: number, change: number, changePercent: number } | null>(null);

  useEffect(() => {
    const fetchIhsg = async () => {
      try {
        const res = await fetch('/api/ihsg');
        if (res.ok) {
          const data = await res.json();
          setIhsg(data);
        }
      } catch (err) {
        console.error("Failed to fetch IHSG:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchIhsg();
  }, []);

  return (
    <div className="p-8 flex flex-col gap-8 h-full overflow-y-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Market Intelligence</h2>
        <p className="text-slate-400">LQ45 Smart Performance Radar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="IHSG" 
          value={ihsg ? ihsg.price.toLocaleString('id-ID', { minimumFractionDigits: 2 }) : "Loading..."} 
          trend={ihsg ? ihsg.changePercent : 0} 
          subtext={ihsg ? `${ihsg.change > 0 ? '+' : ''}${ihsg.change.toFixed(2)} pts` : "Fetching..."} 
        />
        <MetricCard title="Market Cap" value="Rp 8.4T" trend={0.8} subtext="Total LQ45 Cap" color="purple" />
        <MetricCard title="Buy Signal" value="12 Stocks" trend={4.5} subtext="Technical Pick" />
        <MetricCard title="Ave. RS(14)" value="54.2" trend={-0.2} subtext="Neutral Zone" color="purple" />
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('price-alert', (alert: any) => {
      setNotifications(prev => [
        {
          id: Math.random().toString(36).substring(7),
          ticker: alert.ticker,
          price: alert.price,
          threshold: alert.threshold,
          type: alert.type,
          time: new Date()
        },
        ...prev
      ]);
      
      // Basic browser notification if permitted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`${alert.ticker} Alert`, {
          body: `Price hit Rp ${alert.price.toLocaleString('id-ID')} (${alert.type} ${alert.threshold})`,
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-dark-bg selection:bg-electric-cyan selection:text-dark-bg">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0">
        <Header 
          notifications={notifications} 
          clearNotifications={() => setNotifications([])} 
        />
        
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0"
            >
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'analysis' && <AnalysisTab socket={socket} />}
              {activeTab === 'screener' && <StockScreener />}
              {activeTab === 'portfolio' && <PortfolioTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
