import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, X, Send, ExternalLink, Loader2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RayDB } from '../constants';

const MotionDiv = motion.div as any;

interface RayAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const RayAssistant: React.FC<RayAssistantProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, links?: any[] }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    const userMsg = query;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setQuery('');
    setLoading(true);

    const shops = await RayDB.getShops();
    const offers = await RayDB.getOffers();
    const currentShops = shops.map(s => `${s.name} في ${s.city}`).join(', ');
    const currentOffers = offers.map(o => `${o.title} بخصم ${o.discount}%`).join(', ');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `أنت مساعد ذكي لمنصة "تست" للعروض في مصر. 
        المحلات المتاحة حالياً: ${currentShops}.
        العروض الحالية: ${currentOffers}.
        طلب المستخدم: ${userMsg}.
        رد باللهجة المصرية، كن ودوداً ومختصراً جداً. إذا كان العرض متاحاً في "تست" اذكره بوضوح، وإذا لم يكن ابحث عنه في جوجل.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text || "للأسف مقدرتش ألاقي تفاصيل دلوقت، جرب تسألني عن محل محدد.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      // Extract unique and valid links from grounding metadata
      const linksMap = new Map();
      chunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri) {
          linksMap.set(chunk.web.uri, {
            uri: chunk.web.uri,
            title: chunk.web.title || 'المصدر'
          });
        }
      });
      const links = Array.from(linksMap.values());

      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: text,
        links: links.length > 0 ? links : undefined
      }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: "حصلت مشكلة بسيطة، جرب تسألني تاني." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv 
          initial={{ opacity: 0, x: 400 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 400 }}
          className="fixed left-0 md:left-auto md:right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[200] flex flex-col border-r md:border-l border-slate-100 text-right"
          dir="rtl"
        >
          <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse">
              <Sparkles className="w-5 h-5 text-[#00E5FF]" />
              <h2 className="font-black text-sm uppercase tracking-wider">مساعد تست الذكي</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-300">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-[#00E5FF]" />
                </div>
                <p className="font-black text-lg text-slate-400">أي عرض بتدور عليه في مصر؟</p>
                <p className="text-xs mt-2 max-w-[220px]">اسألني عن أحسن سعر للموبايلات، أو أرخص وجبة غداء في منطقتك.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <MotionDiv 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-[#00E5FF] text-slate-900 font-bold' : 'bg-slate-50 text-slate-700'}`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  
                  {msg.links && msg.links.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/50 space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Globe size={12} className="text-[#00E5FF]" /> مصادر العروض الخارجية:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {msg.links.map((link, idx) => (
                          <a 
                            key={idx} 
                            href={link.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-[#00E5FF] hover:border-[#00E5FF] hover:shadow-md transition-all"
                          >
                            <ExternalLink size={10} />
                            {link.title.length > 25 ? link.title.substring(0, 25) + '...' : link.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </MotionDiv>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-3 flex-row-reverse shadow-sm">
                   <Loader2 className="w-4 h-4 animate-spin text-[#00E5FF]" />
                   <span className="text-xs font-black text-slate-400">بجمعلك أحسن الصفقات...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-white">
            <div className="relative">
              <input 
                type="text" 
                placeholder="اسأل تست..." 
                className="w-full bg-slate-50 rounded-full py-4 pr-6 pl-14 outline-none border-2 border-transparent focus:border-[#00E5FF] transition-all font-bold text-sm text-right"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                onClick={handleSearch}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-slate-900 text-white rounded-full hover:bg-[#BD00FF] transition-colors shadow-lg"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};

export default RayAssistant;