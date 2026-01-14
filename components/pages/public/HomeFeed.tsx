
import React, { useState, useEffect } from 'react';
import { ApiService } from '@/services/api.service';
import { Offer, Shop } from '@/types';
import { Sparkles, TrendingUp, ShoppingCart, CalendarCheck, Loader2, MessageSquarePlus, Send, X, AlertCircle, Eye, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as ReactRouterDOM from 'react-router-dom';
import ReservationModal from '../shared/ReservationModal';
import { GoogleGenAI } from "@google/genai";

const { Link, useNavigate } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

const HomeFeed: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const navigate = useNavigate();
  
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackResponse, setFeedbackResponse] = useState('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [offersData, shopsData] = await Promise.all([
          ApiService.getOffers(),
          ApiService.getShops('approved')
        ]);
        setOffers(offersData);
        setShops(shopsData);
      } catch (e) {
        // Failed to fetch data - handled silently
      } finally {
        setLoading(false);
      }
    };
    loadData();
    window.addEventListener('ray-db-update', loadData);
    return () => window.removeEventListener('ray-db-update', loadData);
  }, []);

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackLoading(true);
    try {
      const userStr = localStorage.getItem('ray_user');
      const user = userStr ? JSON.parse(userStr) : null;

      await ApiService.saveFeedback({
        text: feedbackText,
        userName: user?.name,
        userEmail: user?.email
      });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `المستخدم بعت اقتراح أو شكوى عن تطبيق "تست" في مصر: "${feedbackText}". 
        رد عليه بذكاء ومودة بلهجة مصرية روشة وقصيرة جداً.`,
      });
      setFeedbackResponse(response.text || 'شكراً ليك يا بطل، رأيك وصل وهنظبط الدنيا!');
    } catch (e) {
      setFeedbackResponse('حصل مشكلة بسيطة بس اقتراحك وصل لمهندسينا!');
    } finally {
      setFeedbackLoading(false);
      setFeedbackText('');
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
       <div className="relative">
          <Loader2 className="w-16 h-16 text-[#00E5FF] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-2 h-2 bg-[#BD00FF] rounded-full animate-ping" />
          </div>
       </div>
       <p className="font-black text-slate-400 tracking-widest uppercase text-xs">جاري تسليط الشعاع على أفضل العروض...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-12 relative">
      <div className="flex flex-col items-center text-center mb-10 md:mb-20">
         <MotionDiv 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-full font-black text-[10px] md:text-xs uppercase tracking-[0.2em] mb-10 shadow-2xl"
         >
            <Sparkles className="w-3 h-3 text-[#00E5FF] fill-current" />
            عروض حصرية
         </MotionDiv>
         <h1 className="text-4xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.85]">أفضل العروض<br/><span className="text-[#00E5FF]">في مكان واحد.</span></h1>
         <p className="text-slate-400 text-lg md:text-2xl font-bold max-w-2xl px-4 leading-relaxed mb-12">
            خصومات مميزة من أفضل المحلات والمطاعم في مصر.
         </p>
      </div>

      {/* Offers Grid */}
      <section className="mb-24">
        <div className="flex items-center justify-between mb-12 md:mb-20 flex-row-reverse px-2">
           <h2 className="text-3xl md:text-5xl font-black tracking-tighter">أحدث الانفجارات السعرية</h2>
           <Link to="/shops" className="flex items-center gap-2 text-slate-400 font-black text-xs md:text-sm hover:text-black transition-all group">
             مشاهدة الكل <TrendingUp className="w-4 h-4 group-hover:translate-x-[-4px] transition-transform" />
           </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          {offers.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-300 font-bold">لا توجد عروض نشطة حالياً.</div>
          ) : offers.map((offer) => (
            <MotionDiv 
              key={offer.id}
              className="group bg-white p-5 rounded-[3rem] border border-slate-50 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] transition-all duration-500"
            >
              <div 
                onClick={() => navigate(`/product/${(offer as any).productId || offer.id}`)}
                className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden mb-6 bg-slate-50 cursor-pointer"
              >
                <img src={offer.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" />
                <div className="absolute top-5 left-5 bg-[#BD00FF] text-white px-4 py-2 rounded-2xl font-black text-sm shadow-xl shadow-purple-500/30">-{offer.discount}%</div>
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Eye size={32} className="text-white drop-shadow-lg" />
                </div>
              </div>
              <div className="px-3 text-right">
                <h3 className="text-xl md:text-2xl font-black mb-6 line-clamp-1 leading-tight">{offer.title}</h3>
                <div className="flex items-center justify-between flex-row-reverse">
                   <div className="text-right">
                      <p className="text-slate-300 line-through text-xs font-bold">ج.م {offer.oldPrice}</p>
                      <p className="text-xl md:text-3xl font-black">ج.م {offer.newPrice}</p>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => setSelectedItem(offer)} className="w-12 h-12 bg-[#00E5FF] rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-md"><CalendarCheck size={20} /></button>
                      <button 
                        onClick={() => {
                          const event = new CustomEvent('add-to-cart', { detail: { ...offer, name: offer.title, price: offer.newPrice, quantity: 1 } });
                          window.dispatchEvent(event);
                        }}
                        className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-all shadow-md"
                      >
                        <ShoppingCart size={20} />
                      </button>
                   </div>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>
      </section>

      {/* Feedback Widget */}
      <div className="fixed bottom-10 left-10 z-[150]">
         <AnimatePresence>
            {isFeedbackOpen && (
               <MotionDiv 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                 animate={{ opacity: 1, scale: 1, y: 0 }} 
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="absolute bottom-24 left-0 w-80 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl p-8 text-right"
                 dir="rtl"
               >
                  <div className="flex items-center justify-between mb-6">
                     <h4 className="font-black text-slate-900 flex items-center gap-2"><Sparkles size={16} className="text-[#00E5FF]" /> مساعد تحسين تست</h4>
                     <button onClick={() => setIsFeedbackOpen(false)}><X size={16} /></button>
                  </div>
                  
                  {feedbackResponse ? (
                    <div className="space-y-4">
                       <p className="text-sm font-bold text-[#BD00FF] bg-purple-50 p-6 rounded-3xl leading-loose">{feedbackResponse}</p>
                       <button onClick={() => {setFeedbackResponse(''); setIsFeedbackOpen(false);}} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs">شكراً يا ري!</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       <p className="text-xs text-slate-400 font-bold mb-4">عندك فكرة أو شايف حاجة مش عجباك؟ احنا لسه بنجرب ومحتاجين رأيك.</p>
                       <textarea 
                          className="w-full bg-slate-50 rounded-2xl p-4 text-xs font-bold border-none focus:ring-2 focus:ring-[#00E5FF] h-28 outline-none"
                          placeholder="اكتب اقتراحك هنا يا بطل..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                       />
                       <button 
                        onClick={handleSendFeedback}
                        disabled={feedbackLoading}
                        className="w-full py-5 bg-[#00E5FF] text-black rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl"
                       >
                          {feedbackLoading ? <Loader2 className="animate-spin" size={16} /> : <><MessageSquarePlus size={16} /> إرسال لمهندسينا</>}
                       </button>
                    </div>
                  )}
               </MotionDiv>
            )}
         </AnimatePresence>
         <button 
            onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
            className="w-20 h-20 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:scale-110 transition-all hover:bg-[#BD00FF] group"
         >
            <MessageSquarePlus className="group-hover:rotate-12 transition-transform" />
         </button>
      </div>

      <ReservationModal 
        isOpen={!!selectedItem} 
        onClose={() => setSelectedItem(null)} 
        item={selectedItem ? {
          id: selectedItem.id,
          name: selectedItem.title,
          image: selectedItem.imageUrl,
          price: selectedItem.newPrice,
          shopId: selectedItem.shopId,
          shopName: selectedItem.shopName
        } : null} 
      />
    </div>
  );
};

export default HomeFeed;
