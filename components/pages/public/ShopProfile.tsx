
import React, { useEffect, useState, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { RayDB } from '@/constants';
import { Shop, Product, ShopDesign, Offer, Category, ShopGallery } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, ChevronRight, X, Plus, Check, Heart, Users, 
  CalendarCheck, Eye, Layout, Palette, Layers, MousePointer2, 
  Zap, Loader2, AlertCircle, Home, Share2, Utensils, ShoppingBag, 
  Info, Clock, MapPin, Phone, MessageCircle, Sliders, Monitor, Send, Camera,
  Tag
} from 'lucide-react';
import ReservationModal from '../shared/ReservationModal';
import { ShopGallery as ShopGalleryComponent, useToast } from '@/components';
import { ApiService } from '@/services/api.service';

const { useParams, useNavigate, useLocation } = ReactRouterDOM as any;
const MotionImg = motion.img as any;
const MotionDiv = motion.div as any;

const ProductCard: React.FC<{ 
  product: Product, 
  design: ShopDesign, 
  offer?: Offer,
  onAdd: (p: Product, price: number) => void,
  isAdded: boolean,
  onReserve: (p: any) => void
}> = ({ product, design, offer, onAdd, isAdded, onReserve }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const navigate = useNavigate();

  const isMinimal = design.layout === 'minimal';
  const isModern = design.layout === 'modern';
  const isBold = design.layout === 'bold';

  useEffect(() => {
    const favs = RayDB.getFavorites();
    setIsFavorite(favs.includes(product.id));
  }, [product.id]);

  const toggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const state = RayDB.toggleFavorite(product.id);
    setIsFavorite(state);
    // Notify other components that favorites changed
    window.dispatchEvent(new Event('ray-db-update'));
    
    // Show toast notification
    const message = state ? 'تمت إضافة المنتج للمفضلة! ❤️' : 'تم حذف المنتج من المفضلة';
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[9999] font-black text-sm animate-pulse';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const currentPrice = offer ? offer.newPrice : product.price;

  return (
    <MotionDiv 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className={`group relative bg-white transition-all duration-500 flex flex-col h-full overflow-hidden ${
        isBold ? 'rounded-[1.8rem] md:rounded-[2.5rem] border-2 shadow-2xl p-2 md:p-2.5' : 
        isModern ? 'rounded-[1.2rem] md:rounded-[1.5rem] border border-slate-100 shadow-lg p-1.5' :
        'rounded-none border-b border-slate-100 p-0 shadow-none'
      }`}
      style={{ borderColor: isBold ? design.primaryColor : isModern ? `${design.primaryColor}15` : undefined }}
    >
      <div 
        onClick={() => navigate(`/product/${product.id}`)}
        className={`relative aspect-square overflow-hidden cursor-pointer ${
          isBold ? 'rounded-[1.4rem] md:rounded-[2rem]' : isModern ? 'rounded-[1rem]' : 'rounded-none'
        }`}
      >
        <img 
          src={product.imageUrl || (product as any).image_url} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1s]" 
          alt={product.name} 
        />
        
        {offer && (
          <div className="absolute top-2 right-2 bg-[#BD00FF] text-white px-2 py-0.5 md:px-2.5 md:py-1 rounded-full font-black text-[8px] md:text-[10px] shadow-lg flex items-center gap-1 z-10">
            <Zap size={8} fill="currentColor" className="md:w-[10px] md:h-[10px]" /> {offer.discount}%
          </div>
        )}

        <div className="absolute inset-0 bg-black/5 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <div className="w-8 h-8 md:w-10 md:h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl">
              <Eye size={14} className="md:w-4 md:h-4" />
           </div>
        </div>

        <button 
          onClick={toggleFav} 
          className={`absolute top-2 left-2 p-2 md:p-2.5 transition-all z-10 shadow-sm ${
            isFavorite ? 'bg-red-500 text-white' : 'bg-white/80 backdrop-blur-sm text-slate-900'
          } rounded-full`}
        >
           <Heart size={12} className="md:w-[14px] md:h-[14px]" fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className={`p-2 md:p-4 flex flex-col flex-1 text-right ${isMinimal ? 'items-end' : ''}`}>
        <h4 className={`font-black mb-2 line-clamp-2 leading-tight text-slate-800 ${isBold ? 'text-base md:text-xl' : 'text-xs md:text-base'}`}>
          {product.name}
        </h4>
        
        <div className="mt-auto w-full">
          <div className={`flex items-center justify-between flex-row-reverse mb-2 md:mb-3 ${isMinimal ? 'flex-col items-end gap-1' : ''}`}>
             <div className="text-right">
                {offer && <p className="text-slate-300 line-through text-[8px] md:text-[10px] font-bold">ج.م {product.price}</p>}
                <span className={`font-black tracking-tighter ${isBold ? 'text-base md:text-2xl' : 'text-sm md:text-xl'}`} style={{ color: offer ? '#BD00FF' : design.primaryColor }}>
                  ج.م {currentPrice}
                </span>
             </div>
          </div>
          
          <div className="flex gap-1.5 md:gap-2">
             <button 
               onClick={(e) => { e.stopPropagation(); onAdd(product, currentPrice); }}
               className={`flex-1 py-2 md:py-3 flex items-center justify-center gap-1.5 md:gap-2 transition-all active:scale-90 ${
                 isAdded ? 'bg-green-500' : 'bg-slate-900'
               } text-white ${isBold ? 'rounded-xl md:rounded-[1.2rem]' : isModern ? 'rounded-lg md:rounded-xl' : 'rounded-none'} shadow-md`}
             >
               {isAdded ? <Check size={12} /> : <Plus size={12} />}
               <span className="text-[9px] md:text-[11px] font-black uppercase">{isAdded ? 'تم' : 'للسلة'}</span>
             </button>
             <button 
               onClick={(e) => { e.stopPropagation(); onReserve({...product, price: currentPrice}); }}
               className={`flex-1 py-2 md:py-3 text-black flex items-center justify-center gap-1.5 md:gap-2 font-black text-[9px] md:text-[11px] uppercase transition-all active:scale-95 shadow-md ${isBold ? 'rounded-xl md:rounded-[1.2rem]' : isModern ? 'rounded-lg md:rounded-xl' : 'rounded-none'}`}
               style={{ backgroundColor: design.primaryColor }}
             >
               <CalendarCheck size={12} /> حجز
             </button>
          </div>
        </div>
      </div>
    </MotionDiv>
  );
};

const ChatWindow: React.FC<{ shop: Shop, onClose: () => void }> = ({ shop, onClose }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ray_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      loadMessages(parsed.id);
      
      const sub = ApiService.subscribeToMessages(shop.id, (newMsg) => {
        if (newMsg.userId === parsed.id) {
          setMessages(prev => [...prev, newMsg]);
        }
      });
      return () => { sub.unsubscribe(); };
    }
  }, [shop.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadMessages = async (userId: string) => {
    const data = await ApiService.getMessages(shop.id, userId);
    setMessages(data);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;
    const msg = {
      shopId: shop.id,
      userId: user.id,
      senderId: user.id,
      senderName: user.name,
      text: inputText,
      role: 'customer' as const
    };
    setInputText('');
    await ApiService.sendMessage(msg);
  };

  if (!user) return (
    <div className="p-8 text-center bg-white rounded-3xl shadow-2xl w-[calc(100vw-2rem)] md:w-[320px]">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
         <MessageCircle size={32} className="text-[#00E5FF]" />
      </div>
      <p className="font-black text-sm mb-6 leading-relaxed text-slate-600">سجل دخولك الآن عشان تقدر تدردش مع {shop.name} مباشرة</p>
      <button onClick={() => window.location.hash = '/login'} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:scale-105 transition-transform">دخول / تسجيل</button>
    </div>
  );

  return (
    <MotionDiv initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-[calc(100vw-2rem)] md:w-[400px] h-[450px] md:h-[500px] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
      <header className="p-5 md:p-6 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={shop.logoUrl || (shop as any).logo_url} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/20" />
          <div className="text-right">
            <p className="font-black text-xs md:text-sm leading-none mb-1">{shop.name}</p>
            <p className="text-[9px] md:text-[10px] text-green-400 font-bold flex items-center gap-1 justify-end">متصل الآن <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-green-400 rounded-full inline-block" /></p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={18} /></button>
      </header>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50 no-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <MessageCircle size={40} className="mb-2" />
            <p className="text-[10px] font-bold">ابدأ المحادثة مع {shop.name}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'customer' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-2xl text-[11px] md:text-xs font-bold shadow-sm ${m.role === 'customer' ? 'bg-[#00E5FF] text-slate-900' : 'bg-white text-slate-700'}`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 md:p-4 bg-white border-t border-slate-100 flex gap-2">
        <input 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="اكتب رسالتك هنا..."
          className="flex-1 bg-slate-50 rounded-xl px-4 py-3 outline-none font-bold text-[11px] md:text-xs text-right"
        />
        <button onClick={handleSend} className="w-10 h-10 md:w-12 md:h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
          <Send size={16} className="rotate-180" />
        </button>
      </div>
    </MotionDiv>
  );
};

const ShopProfile: React.FC = () => {
  const { slug } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [currentDesign, setCurrentDesign] = useState<ShopDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [spatialMode, setSpatialMode] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [galleryImages, setGalleryImages] = useState<ShopGallery[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'offers' | 'gallery' | 'info'>('products');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [hasFollowed, setHasFollowed] = useState(false);
  const [selectedProductForRes, setSelectedProductForRes] = useState<any | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenChat = params.get('chat') === '1' || params.get('chat') === 'true';
    if (shouldOpenChat) setShowChat(true);
  }, [location.search]);

  useEffect(() => {
    const syncData = async () => {
      if (!slug) return;
      setLoading(true);
      setError(false);
      try {
        const currentShopData = await ApiService.getShopBySlug(slug);
        if (currentShopData) {
          setShop(JSON.parse(JSON.stringify(currentShopData)));
          setCurrentDesign(currentShopData.pageDesign);
          const [prodData, allOffers, galleryData] = await Promise.all([
            ApiService.getProducts(currentShopData.id),
            ApiService.getOffers(),
            ApiService.getShopGallery(currentShopData.id)
          ]);
          setProducts(prodData);
          setOffers(allOffers.filter((o: any) => o.shopId === currentShopData.id));
          setGalleryImages(galleryData);
        } else {
          setError(true);
        }
      } catch (err) {
        // Error fetching shop data - handled silently
        setError(true);
      } finally {
        setTimeout(() => setLoading(false), 400);
      }
    };
    syncData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.addEventListener('ray-db-update', syncData);
    return () => {
      window.removeEventListener('ray-db-update', syncData);
    };
  }, [slug]);

  const handleShare = async () => {
    if (!shop) return;
    const shareData = {
      title: shop.name,
      text: `شوفوا المحل ده على منصة تست: ${shop.name}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        addToast('تم نسخ الرابط لمشاركته!', 'info');
      }
    } catch (e) {}
  };

  if (loading || !currentDesign) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-[#00E5FF] animate-spin mb-4" />
      <h2 className="text-xl md:text-2xl font-black tracking-tight">جاري تهيئة المتجر...</h2>
    </div>
  );

  if (error || !shop) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <AlertCircle className="w-16 h-16 md:w-20 md:h-20 text-slate-300 mb-8" />
      <h2 className="text-2xl md:text-3xl font-black mb-4">المحل غير متاح حالياً</h2>
      <button onClick={() => navigate('/')} className="px-8 py-4 md:px-10 md:py-5 bg-slate-900 text-white rounded-full font-black flex items-center gap-3 shadow-xl"><Home size={20} /> العودة للرئيسية</button>
    </div>
  );

  const isRestaurant = shop.category === Category.RESTAURANT;
  const isBold = currentDesign.layout === 'bold';
  const isMinimal = currentDesign.layout === 'minimal';
  
  const categories = ['الكل', ...new Set(products.map(p => (p as any).category || 'عام'))];
  const filteredProducts = activeCategory === 'الكل' ? products : products.filter(p => (p as any).category === activeCategory);
  
  // Separate products with and without offers
  const productsWithoutOffers = filteredProducts.filter(p => {
    const hasOffer = offers.some(o => o.productId === p.id);
    return !hasOffer;
  });
  const productsWithOffers = filteredProducts.filter(p => {
    const hasOffer = offers.some(o => o.productId === p.id);
    return hasOffer;
  });

  // Debug logging (remove in production)
  console.log('Total products:', filteredProducts.length);
  console.log('Products without offers:', productsWithoutOffers.length);
  console.log('Products with offers:', productsWithOffers.length);
  console.log('Offers loaded:', offers.length);

  return (
    <div className={`min-h-screen text-right font-sans overflow-x-hidden ${isMinimal ? 'bg-slate-50' : 'bg-white'}`} dir="rtl">
      
      {/* Dynamic Navigation UI */}
      <div className="fixed bottom-6 md:bottom-10 right-4 md:right-8 z-[150] flex flex-col gap-4 items-end">
         <AnimatePresence>
            {showChat && <ChatWindow shop={shop} onClose={() => setShowChat(false)} />}
         </AnimatePresence>
         
         <button 
           onClick={() => setShowChat(!showChat)}
           className={`w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-white text-white ${showChat ? 'bg-red-500' : 'bg-slate-900'}`}
           style={{ backgroundColor: !showChat ? currentDesign.primaryColor : undefined, color: !showChat ? '#000' : undefined }}
         >
            {showChat ? <X size={24} className="md:w-7 md:h-7" /> : <MessageCircle size={24} className="md:w-7 md:h-7" />}
         </button>
      </div>

      {/* Header Buttons */}
      <div className="fixed top-0 left-0 right-0 z-[110] p-3 md:p-4 flex justify-between items-center pointer-events-none">
         <button onClick={() => navigate(-1)} className="p-2 md:p-3 bg-white/90 backdrop-blur-md rounded-xl md:rounded-2xl shadow-xl pointer-events-auto active:scale-90 transition-transform"><ChevronRight size={20} className="md:w-6 md:h-6" /></button>
         <button onClick={handleShare} className="p-2 md:p-3 bg-white/90 backdrop-blur-md rounded-xl md:rounded-2xl shadow-xl pointer-events-auto active:scale-90 transition-transform"><Share2 size={20} className="md:w-6 md:h-6" /></button>
      </div>

      {/* Hero Section */}
      <section className={`relative transition-all duration-1000 overflow-hidden bg-slate-900 ${
        isBold ? 'h-[45vh] md:h-[85vh] m-0 md:m-6 md:rounded-[4.5rem] shadow-2xl' : isMinimal ? 'h-[25vh] md:h-[45vh]' : 'h-[35vh] md:h-[60vh]'
      }`}>
        <MotionImg initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 15 }} src={currentDesign.bannerUrl} className="w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-6 md:bottom-10 left-0 right-0 flex justify-center px-6">
           <button onClick={() => setSpatialMode(true)} className="bg-white/95 backdrop-blur-sm text-slate-900 px-6 py-3 md:px-8 md:py-4 rounded-full font-black text-xs md:text-base flex items-center gap-2 md:gap-3 shadow-2xl active:scale-95 transition-all border border-slate-100 hover:gap-5">
             <Eye size={16} className="md:w-5 md:h-5 text-[#00E5FF] animate-pulse" /> استكشاف المتجر 3D
           </button>
        </div>
      </section>

      {/* Brand Header */}
      <div className={`max-w-[1400px] mx-auto px-4 md:px-12 relative z-10 pb-16 md:pb-24 ${isBold ? '-mt-16 md:-mt-48' : '-mt-10 md:-mt-24'}`}>
        <div className={`flex flex-col items-center md:items-end md:flex-row-reverse gap-4 md:gap-16 ${isMinimal ? 'md:items-center' : ''}`}>
          <MotionDiv 
            initial={{ y: 30, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }} 
            className={`bg-white p-1 md:p-1.5 shadow-2xl shrink-0 ring-4 ring-white ${isBold ? 'rounded-[2rem] md:rounded-[3rem] w-24 h-24 md:w-64 md:h-64 rotate-3' : isMinimal ? 'rounded-xl md:rounded-2xl w-20 h-20 md:w-48 md:h-48' : 'rounded-full w-24 h-24 md:w-56 md:h-56'}`}
          >
            <img src={shop.logoUrl || (shop as any).logo_url} className={`w-full h-full object-cover ${isBold ? 'rounded-[1.8rem] md:rounded-[2.5rem]' : isMinimal ? 'rounded-lg md:rounded-xl' : 'rounded-full'}`} />
          </MotionDiv>
          
          <div className={`flex-1 text-center md:text-right ${isMinimal ? 'md:text-center' : ''}`}>
            <div className={`flex items-center justify-center md:justify-start gap-2 mb-2 md:mb-3 flex-row-reverse ${isMinimal ? 'md:justify-center' : ''}`}>
               {isRestaurant ? <Utensils size={14} className="md:w-4 md:h-4 text-[#BD00FF]" /> : <ShoppingBag size={14} className="md:w-4 md:h-4 text-[#00E5FF]" />}
               <span className="text-slate-400 font-black text-[9px] md:text-xs uppercase tracking-widest">{shop.category} • {shop.city}</span>
            </div>
            <h1 className={`font-black tracking-tighter mb-4 md:mb-5 leading-tight ${isBold ? 'text-3xl md:text-8xl lg:text-[10rem]' : isMinimal ? 'text-2xl md:text-6xl' : 'text-3xl md:text-7xl'}`} style={{ color: currentDesign.primaryColor }}>{shop.name}</h1>
            
            <div className={`flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-4 mb-8 ${isMinimal ? 'md:justify-center' : ''}`}>
              <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 md:px-5 md:py-2 rounded-full border border-slate-100 flex items-center gap-1.5 md:gap-2 shadow-sm">
                 <Star size={12} className="md:w-[14px] md:h-[14px] text-amber-400 fill-current" />
                 <span className="font-black text-xs md:text-sm">{shop.rating}</span>
              </div>
              <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 md:px-5 md:py-2 rounded-full border border-slate-100 flex items-center gap-1.5 md:gap-2 shadow-sm">
                 <Users size={12} className="md:w-[14px] md:h-[14px] text-slate-400" />
                 <span className="font-black text-xs md:text-sm">{shop.followers?.toLocaleString() || 0}</span>
              </div>
              <button 
                onClick={() => { ApiService.followShop(shop.id); setHasFollowed(true); }}
                className={`px-6 py-1.5 md:px-8 md:py-2.5 rounded-full font-black text-[11px] md:text-sm transition-all shadow-xl active:scale-95 ${hasFollowed ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-black'}`}
              >
                {hasFollowed ? 'متابع' : 'متابعة المتجر'}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex items-center gap-4 md:gap-12 border-b mt-8 md:mt-12 mb-8 md:mb-10 overflow-x-auto no-scrollbar scroll-smooth ${isBold ? 'border-slate-200' : 'border-slate-100'}`}>
           <NavTab 
             active={activeTab === 'products'} 
             onClick={() => setActiveTab('products')} 
             label="المنتجات" 
             primaryColor={currentDesign.primaryColor}
             layout={currentDesign.layout}
           />
           <NavTab 
             active={activeTab === 'offers'} 
             onClick={() => setActiveTab('offers')} 
             label="العروض" 
             primaryColor={currentDesign.primaryColor}
             layout={currentDesign.layout}
           />
           <NavTab 
             active={activeTab === 'gallery'} 
             onClick={() => setActiveTab('gallery')} 
             label="معرض الصور" 
             primaryColor={currentDesign.primaryColor}
             layout={currentDesign.layout}
           />
           <NavTab 
             active={activeTab === 'info'} 
             onClick={() => setActiveTab('info')} 
             label="معلومات المتجر" 
             primaryColor={currentDesign.primaryColor}
             layout={currentDesign.layout}
           />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'products' ? (
            <MotionDiv key="products-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 md:mb-10 pb-2">
                {categories.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setActiveCategory(cat)}
                    className={`px-5 py-2 md:px-6 md:py-2.5 rounded-full font-black text-[10px] md:text-xs whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className={`grid gap-3 md:gap-8 ${isMinimal ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {productsWithoutOffers.length === 0 ? (
                  <div className="col-span-full py-16 md:py-24 text-center text-slate-300 font-bold border-2 border-dashed border-slate-100 rounded-[2rem] md:rounded-[3rem]">
                    <Info size={40} className="md:w-12 md:h-12 mx-auto mb-4 opacity-20" />
                    لا توجد منتجات بدون خصم في هذا القسم حالياً.
                  </div>
                ) : (
                  productsWithoutOffers.map((p) => (
                    <ProductCard 
                      key={p.id} 
                      product={p} 
                      design={currentDesign!} 
                      offer={undefined}
                      onAdd={(prod, price) => {
                        setAddedItemId(prod.id);
                        RayDB.addToCart({ ...prod, price, quantity: 1, shopId: shop.id, shopName: shop.name });
                        setTimeout(() => setAddedItemId(null), 1500);
                      }} 
                      isAdded={addedItemId === p.id} 
                      onReserve={(data) => setSelectedProductForRes({...data, shopId: shop.id, shopName: shop.name})}
                    />
                  ))
                )}
              </div>
            </MotionDiv>
          ) : activeTab === 'offers' ? (
            <MotionDiv key="offers-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="mb-8 md:mb-10">
                <h2 className={`font-black mb-4 md:mb-6 ${isBold ? 'text-2xl md:text-4xl' : 'text-xl md:text-3xl'}`} style={{ color: '#BD00FF' }}>
                  عروض {shop.name}
                </h2>
                <p className="text-slate-600 text-sm md:text-base">
                  استكشف أفضل الخصومات والعروض الحصرية من {shop.name}
                </p>
              </div>
              
              <div className={`grid gap-3 md:gap-8 ${isMinimal ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
                {productsWithOffers.length === 0 ? (
                  <div className="col-span-full py-16 md:py-24 text-center text-slate-300 font-bold border-2 border-dashed border-slate-100 rounded-[2rem] md:rounded-[3rem]">
                    <Tag size={40} className="md:w-12 md:h-12 mx-auto mb-4 opacity-20" />
                    لا توجد عروض متاحة حالياً.
                  </div>
                ) : (
                  productsWithOffers.map((p) => {
                    const offer = offers.find(o => o.productId === p.id);
                    return (
                      <ProductCard 
                        key={p.id} 
                        product={p} 
                        design={currentDesign!} 
                        offer={offer}
                        onAdd={(prod, price) => {
                          setAddedItemId(prod.id);
                          RayDB.addToCart({ ...prod, price, quantity: 1, shopId: shop.id, shopName: shop.name });
                          setTimeout(() => setAddedItemId(null), 1500);
                        }} 
                        isAdded={addedItemId === p.id} 
                        onReserve={(data) => setSelectedProductForRes({...data, shopId: shop.id, shopName: shop.name})}
                      />
                    );
                  })
                )}
              </div>
            </MotionDiv>
          ) : activeTab === 'gallery' ? (
            <MotionDiv key="gallery-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="mb-8 md:mb-10">
                <h2 className={`font-black mb-4 md:mb-6 ${isBold ? 'text-2xl md:text-4xl' : 'text-xl md:text-3xl'}`} style={{ color: currentDesign.primaryColor }}>
                  معرض {shop.name}
                </h2>
                <p className="text-slate-600 text-sm md:text-base">
                  استكشف صور ومعارض من {shop.name}
                </p>
              </div>
              <ShopGalleryComponent 
                images={galleryImages}
                shopName={shop.name}
                primaryColor={currentDesign.primaryColor}
                layout={currentDesign.layout}
              />
            </MotionDiv>
          ) : (
            <MotionDiv key="info-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
               <div className={`p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 space-y-6 md:space-y-8 ${isMinimal ? 'bg-white' : 'bg-slate-50'}`}>
                  <h3 className="text-xl md:text-2xl font-black mb-4">تفاصيل التواصل</h3>
                  <div className="grid grid-cols-1 gap-5 md:gap-6">
                    <InfoItem 
                      icon={<MapPin className="md:w-5 md:h-5 text-[#00E5FF]" />} 
                      title="العنوان" 
                      value={shop.addressDetailed || `${shop.city}, ${shop.governorate}`} 
                    />
                    <InfoItem 
                      icon={<Phone className="md:w-5 md:h-5 text-[#BD00FF]" />} 
                      title="رقم الهاتف" 
                      value={shop.phone || 'يرجى التواصل عبر واتساب'} 
                    />
                    <InfoItem 
                      icon={<Clock className="md:w-5 md:h-5 text-slate-400" />} 
                      title="مواعيد العمل" 
                      value={shop.openingHours || 'من ١٠ صباحاً - ١٢ مساءً'} 
                    />
                  </div>
               </div>
               <div className={`p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 flex flex-col justify-center items-center text-center space-y-6 ${isMinimal ? 'bg-white' : 'bg-slate-50'}`}>
                  <div className={`w-16 h-16 md:w-24 md:h-24 bg-white rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-xl mb-2 ${isBold ? 'rotate-6' : ''}`}>
                     <MessageCircle size={isBold ? 32 : 28} className="md:w-10 md:h-10 text-green-500" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black">تحدث مع المتجر</h3>
                  <p className="text-slate-500 font-bold max-w-xs leading-relaxed text-xs md:text-base">هل لديك استفسار محدد؟ يمكنك التواصل مع إدارة المتجر مباشرة للحصول على رد سريع.</p>
                  <button onClick={() => setShowChat(true)} className="w-full md:w-auto px-8 py-4 md:px-10 md:py-5 bg-green-500 text-white rounded-2xl md:rounded-[1.5rem] font-black text-sm md:text-base flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-transform active:scale-95">
                     <MessageCircle size={18} className="md:w-5 md:h-5" /> فتح محادثة فورية
                  </button>
               </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>

      {/* Reservation Modal */}
      <ReservationModal 
        isOpen={!!selectedProductForRes} 
        onClose={() => setSelectedProductForRes(null)} 
        item={selectedProductForRes ? {
          id: selectedProductForRes.id,
          name: selectedProductForRes.name,
          image: selectedProductForRes.imageUrl || (selectedProductForRes as any).image_url,
          price: selectedProductForRes.price,
          shopId: selectedProductForRes.shopId,
          shopName: selectedProductForRes.shopName
        } : null}
      />

      {/* Spatial Discovery Overlay */}
      <AnimatePresence>
        {spatialMode && (
          <MotionDiv key="spatial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-6 md:p-8 text-center text-white">
             <div className="relative mb-8 md:mb-12">
               <div className="w-20 h-20 md:w-24 md:h-24 border-[4px] md:border-[6px] rounded-full border-white/5 border-t-[#00E5FF] animate-spin" />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 md:w-12 md:h-12 border-[4px] md:border-[6px] rounded-full border-white/5 border-t-[#BD00FF] animate-spin-reverse" />
               </div>
             </div>
             <h2 className="text-3xl md:text-7xl font-black mb-4 md:mb-6 tracking-tighter">جاري تهيئة الشعاع المكاني...</h2>
             <p className="text-slate-400 font-bold text-sm md:text-xl max-w-2xl mx-auto mb-10 md:mb-16 leading-relaxed px-4">
               استعد لتجربة تسوق ثورية. ستتمكن قريباً من المشي داخل "{shop.name}" واختيار منتجاتك بشكل ثلاثي الأبعاد بالكامل من منزلك.
             </p>
             <button onClick={() => setSpatialMode(false)} className="px-10 py-4 md:px-16 md:py-6 bg-white text-black rounded-full font-black text-lg md:text-2xl active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]">العودة للواقع</button>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavTab = ({ active, onClick, label, primaryColor, layout }: any) => {
  const isBold = layout === 'bold';
  return (
    <button 
      onClick={onClick} 
      className={`pb-4 px-2 md:pb-5 md:px-4 transition-all relative whitespace-nowrap font-black flex flex-col items-center ${
        active ? 'opacity-100' : 'text-slate-300 hover:text-slate-400 opacity-70 hover:opacity-100'
      } ${isBold ? 'text-base md:text-2xl' : 'text-sm md:text-xl'}`}
      style={{ color: active ? primaryColor : undefined }}
    >
      {label}
      {active && (
        <motion.div 
          layoutId="tab-underline" 
          className={`absolute bottom-0 left-0 right-0 rounded-t-full ${isBold ? 'h-1.5' : 'h-1'}`}
          style={{ backgroundColor: primaryColor }}
        />
      )}
    </button>
  );
};

const InfoItem = ({ icon, title, value }: any) => (
  <div className="flex items-center gap-4 flex-row-reverse w-full">
     <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">{icon}</div>
     <div className="text-right flex-1 min-w-0">
        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-xs md:text-lg font-black text-slate-800 break-words leading-tight">{value}</p>
     </div>
  </div>
);

export default ShopProfile;
