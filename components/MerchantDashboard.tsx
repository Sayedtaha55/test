
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Zap, Loader2, Sparkles, Eye, 
  Package, CalendarCheck, Settings, Smartphone, Palette, 
  Plus, DollarSign, Users, ShoppingBag, 
  CreditCard, TrendingUp, Bell, Clock, Tag, Trash2, Send, MessageSquare, Megaphone, CheckCircle2, ChevronRight,
  MapPin, User, Phone, MessageCircle, X, Image as ImageIcon, Upload, Wand2, ShoppingCart, BarChart3, UserMinus, UserCheck, Search as SearchIcon, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiService } from '../services/api.service';
import * as ReactRouterDOM from 'react-router-dom';
import { Product, Reservation, Offer, ShopGallery } from '../types';
import POSSystem from './POSSystem';
import PageBuilder from './PageBuilder';
import GalleryManager from './GalleryManager';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { useToast } from './Toaster';

const { useSearchParams, useNavigate } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

type TabType = 'overview' | 'pos' | 'builder' | 'products' | 'reservations' | 'sales' | 'promotions' | 'growth' | 'chats' | 'settings' | 'reports' | 'customers' | 'gallery';

const MerchantDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabType) || 'overview';
  const [currentShop, setCurrentShop] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<ShopGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState<Product | null>(null);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const syncData = async () => {
    const savedUserStr = localStorage.getItem('ray_user');
    if (!savedUserStr) {
      navigate('/login');
      return;
    }
    const savedUser = JSON.parse(savedUserStr);
    
    try {
      const shops = await ApiService.getShops('');
      const myShop = shops.find((s: any) => s.id === savedUser.shopId) || shops[0];
      setCurrentShop(myShop);
      
      const [prodData, resData, salesData, notifData, analyticsData, allOffers, galleryData] = await Promise.all([
        ApiService.getProducts(myShop.id),
        ApiService.getReservations(),
        ApiService.getAllOrders(),
        ApiService.getNotifications(myShop.id),
        ApiService.getShopAnalytics(myShop.id),
        ApiService.getOffers(),
        ApiService.getShopGallery(myShop.id)
      ]);

      setProducts(prodData);
      setReservations(resData.filter((r: any) => r.shop_id === myShop.id));
      setSales(salesData.filter((s: any) => s.shop_id === myShop.id));
      setNotifications(notifData.slice(0, 5));
      setAnalytics(analyticsData);
      setActiveOffers(allOffers.filter((o: any) => o.shopId === myShop.id));
      setGalleryImages(galleryData || []);
    } catch (e) {
      // Dashboard Sync Error - handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, [navigate, activeTab]);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      await ApiService.deleteProduct(id);
      addToast('تم حذف المنتج', 'success');
      syncData();
    } catch (e) {
      addToast('فشل حذف المنتج', 'error');
    }
  };

  const handleUpdateResStatus = async (id: string, status: string) => {
    try {
      await ApiService.updateReservationStatus(id, status);
      addToast('تم تحديث حالة الحجز', 'success');
      syncData();
    } catch (e) {
      addToast('فشل التحديث', 'error');
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'overview': return <OverviewTab shop={currentShop} analytics={analytics} notifications={notifications} />;
      case 'products': return <ProductsTab products={products} onAdd={() => setShowProductModal(true)} onMakeOffer={(p) => setShowOfferModal(p)} onDelete={handleDeleteProduct} />;
      case 'gallery': return <GalleryTab images={galleryImages} onImagesChange={setGalleryImages} shopId={currentShop.id} primaryColor={currentShop.pageDesign?.primaryColor || '#00E5FF'} />;
      case 'promotions': return <PromotionsTab offers={activeOffers} onDelete={(id) => ApiService.deleteOffer(id).then(syncData)} />;
      case 'reservations': return <ReservationsTab reservations={reservations} onUpdateStatus={handleUpdateResStatus} />;
      case 'sales': return <SalesTab sales={sales} />;
      case 'chats': return <ChatsTab shopId={currentShop.id} />;
      case 'growth': return <GrowthTab shop={currentShop} analytics={analytics} products={products} />;
      case 'reports': return <ReportsTab analytics={analytics} sales={sales} />;
      case 'customers': return <CustomersTab shopId={currentShop.id} />;
      case 'settings': return <SettingsTab shop={currentShop} />;
      default: return <OverviewTab shop={currentShop} analytics={analytics} notifications={notifications} />;
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <Loader2 className="animate-spin text-[#00E5FF] w-12 h-12" />
      <p className="font-black text-slate-400">تحميل مركز العمليات...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-10 text-right pb-32 px-4 md:px-6 font-sans" dir="rtl">
      {/* Dynamic Header */}
      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-8 flex-row-reverse">
          <div className="relative group">
             <img src={currentShop.logo_url} className="w-20 h-20 md:w-32 md:h-32 rounded-[2.5rem] object-cover shadow-2xl transition-transform group-hover:scale-105" alt="logo" />
             <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-2xl border-4 border-white flex items-center justify-center text-white shadow-lg">
                <CheckCircle2 size={20} />
             </div>
          </div>
          <div className="text-right">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter mb-2">{currentShop.name}</h1>
            <div className="flex items-center gap-3 justify-end">
               <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-500">{currentShop.category}</span>
               <span className="text-slate-400 font-bold text-sm flex items-center gap-1"><MapPin size={14} /> {currentShop.city}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={() => setSearchParams({ tab: 'pos' })} className="flex-1 md:flex-none px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl"><Smartphone size={20} /> الكاشير الذكي</button>
           <button onClick={() => setSearchParams({ tab: 'builder' })} className="flex-1 md:flex-none px-10 py-5 bg-white border border-slate-200 text-slate-900 rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 hover:bg-slate-50 transition-all"><Palette size={20} /> هوية المتجر</button>
        </div>
      </div>

      {/* Enhanced Navigation */}
      <div className="flex gap-2 p-2 bg-slate-100/60 backdrop-blur-xl rounded-[2.5rem] border border-white/40 overflow-x-auto no-scrollbar sticky top-24 z-40 shadow-inner">
        <TabButton active={activeTab === 'overview'} onClick={() => setSearchParams({ tab: 'overview' })} icon={<TrendingUp size={18} />} label="نظرة عامة" />
        <TabButton active={activeTab === 'gallery'} onClick={() => setSearchParams({ tab: 'gallery' })} icon={<Camera size={18} />} label="معرض الصور" />
        <TabButton active={activeTab === 'reports'} onClick={() => setSearchParams({ tab: 'reports' })} icon={<BarChart3 size={18} />} label="التقارير" />
        <TabButton active={activeTab === 'customers'} onClick={() => setSearchParams({ tab: 'customers' })} icon={<Users size={18} />} label="العملاء" />
        <TabButton active={activeTab === 'products'} onClick={() => setSearchParams({ tab: 'products' })} icon={<Package size={18} />} label="المخزون" />
        <TabButton active={activeTab === 'promotions'} onClick={() => setSearchParams({ tab: 'promotions' })} icon={<Megaphone size={18} />} label="العروض" />
        <TabButton active={activeTab === 'reservations'} onClick={() => setSearchParams({ tab: 'reservations' })} icon={<CalendarCheck size={18} />} label="الحجوزات" />
        <TabButton active={activeTab === 'chats'} onClick={() => setSearchParams({ tab: 'chats' })} icon={<MessageCircle size={18} />} label="المحادثات" />
        <TabButton active={activeTab === 'sales'} onClick={() => setSearchParams({ tab: 'sales' })} icon={<CreditCard size={18} />} label="المبيعات" />
        <TabButton active={activeTab === 'growth'} onClick={() => setSearchParams({ tab: 'growth' })} icon={<Sparkles size={18} />} label="نمو AI" />
        <TabButton active={activeTab === 'settings'} onClick={() => setSearchParams({ tab: 'settings' })} icon={<Settings size={18} />} label="الإعدادات" />
      </div>

      <AnimatePresence mode="wait">
        <MotionDiv key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          {activeTab === 'pos' ? <POSSystem onClose={() => setSearchParams({ tab: 'overview' })} /> : 
           activeTab === 'builder' ? <PageBuilder onClose={() => setSearchParams({ tab: 'overview' })} /> : 
           renderContent()}
        </MotionDiv>
      </AnimatePresence>

      <AddProductModal isOpen={showProductModal} onClose={() => { setShowProductModal(false); syncData(); }} shopId={currentShop.id} />
      <CreateOfferModal product={showOfferModal} onClose={() => { setShowOfferModal(null); syncData(); }} shopId={currentShop.id} />
    </div>
  );
};

// --- New: Reports Tab ---
const ReportsTab: React.FC<{ analytics: any, sales: any[] }> = ({ analytics, sales }) => {
  const monthlyData = [
    { name: 'يناير', revenue: 12000 },
    { name: 'فبراير', revenue: 19000 },
    { name: 'مارس', revenue: 15000 },
    { name: 'أبريل', revenue: 22000 },
    { name: 'مايو', revenue: 30000 },
    { name: 'يونيو', revenue: 28000 },
  ];

  return (
    <div className="space-y-10">
      <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-12 flex-row-reverse">
          <h3 className="text-3xl font-black">أداء الإيرادات الشهرية</h3>
          <div className="flex gap-2">
            <span className="bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold">آخر ٦ أشهر</span>
          </div>
        </div>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="revenue" fill="#00E5FF" radius={[10, 10, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ReportSummaryCard label="متوسط قيمة السلة" value="ج.م ٤٥٠" growth="+١٢٪" />
        <ReportSummaryCard label="نسبة التحويل" value="٨.٥٪" growth="+٥٪" />
        <ReportSummaryCard label="العائد المتوقع" value="ج.م ٣٤,٠٠٠" growth="+٢٠٪" />
      </div>
    </div>
  );
};

const ReportSummaryCard = ({ label, value, growth }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 text-right">
    <p className="text-slate-400 font-black text-xs uppercase mb-2">{label}</p>
    <div className="flex items-end justify-between flex-row-reverse">
       <span className="text-3xl font-black">{value}</span>
       <span className="text-green-500 font-bold text-xs bg-green-50 px-3 py-1 rounded-full">{growth}</span>
    </div>
  </div>
);

// --- New: Customers Tab ---
const CustomersTab: React.FC<{ shopId: string }> = ({ shopId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([
    { id: 'c1', name: 'أحمد محمود', email: 'ahmed@test.com', totalSpent: 1200, status: 'active', orders: 4 },
    { id: 'c2', name: 'سارة علي', email: 'sara@test.com', totalSpent: 2500, status: 'active', orders: 7 },
    { id: 'c3', name: 'ياسين كمال', email: 'yassin@test.com', totalSpent: 0, status: 'blocked', orders: 0 },
    { id: 'c4', name: 'مي حسن', email: 'mai@test.com', totalSpent: 850, status: 'active', orders: 2 },
  ]);
  const { addToast } = useToast();

  const toggleStatus = (id: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const newStatus = c.status === 'active' ? 'blocked' : 'active';
        addToast(`تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} حساب العميل`, 'info');
        return { ...c, status: newStatus };
      }
      return c;
    }));
  };

  const filtered = customers.filter(c => c.name.includes(searchTerm) || c.email.includes(searchTerm));

  return (
    <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 flex-row-reverse">
        <h3 className="text-3xl font-black">قاعدة بيانات العملاء</h3>
        <div className="relative w-full md:w-96">
           <SearchIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             placeholder="بحث باسم العميل أو بريده..."
             className="w-full bg-slate-50 rounded-2xl py-4 pr-14 pl-6 font-bold outline-none border-none text-right focus:ring-2 focus:ring-[#00E5FF]/20 transition-all"
           />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">العميل</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي المشتريات</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">عدد الطلبات</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">التحكم</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                <td className="p-6">
                   <div className="flex items-center gap-4 flex-row-reverse">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400">{c.name.charAt(0)}</div>
                      <div>
                        <p className="font-black text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-400 font-bold">{c.email}</p>
                      </div>
                   </div>
                </td>
                <td className="p-6 font-black text-slate-900">ج.م {c.totalSpent.toLocaleString()}</td>
                <td className="p-6 font-black text-slate-500">{c.orders} طلبات</td>
                <td className="p-6 text-left">
                  <button 
                    onClick={() => toggleStatus(c.id)}
                    className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                      c.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white'
                    }`}
                  >
                    {c.status === 'active' ? <div className="flex items-center gap-2">إيقاف <UserMinus size={14}/></div> : <div className="flex items-center gap-2">تفعيل <UserCheck size={14}/></div>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ChatsTab: React.FC<{ shopId: string }> = ({ shopId }) => {
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChats();
    const sub = ApiService.subscribeToMessages(shopId, (newMsg) => {
      if (selectedChat && (newMsg.sender_id === selectedChat.userId || newMsg.role === 'merchant')) {
        setMessages(prev => [...prev, newMsg]);
      }
      loadChats(); // تحديث قائمة المحادثات في الجنب
    });
    return () => { sub.unsubscribe(); };
  }, [shopId, selectedChat]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadChats = async () => {
    const data = await ApiService.getMerchantChats(shopId);
    setChats(data);
  };

  const loadMessages = async (userId: string) => {
    const data = await ApiService.getMessages(shopId, userId);
    setMessages(data);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedChat) return;
    const user = JSON.parse(localStorage.getItem('ray_user') || '{}');
    await ApiService.sendMessage({
      shopId,
      senderId: user.id,
      senderName: user.name,
      text: inputText,
      role: 'merchant'
    });
    setInputText('');
  };

  return (
    <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm h-[700px] flex overflow-hidden">
       {/* Chat List */}
       <div className="w-80 border-l border-slate-100 flex flex-col">
          <div className="p-8 border-b border-slate-50">
             <h3 className="text-xl font-black">الرسائل الواردة</h3>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
             {chats.length === 0 ? (
               <div className="p-10 text-center text-slate-300 font-bold">لا يوجد محادثات حالياً.</div>
             ) : (
               chats.map(chat => (
                 <button 
                   key={chat.userId} 
                   onClick={() => { setSelectedChat(chat); loadMessages(chat.userId); }}
                   className={`w-full p-6 text-right flex items-center gap-4 flex-row-reverse border-b border-slate-50 transition-all ${selectedChat?.userId === chat.userId ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                 >
                    <div className="w-12 h-12 rounded-full bg-slate-200 shrink-0 flex items-center justify-center font-black text-slate-500">
                       {chat.userName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="font-black truncate">{chat.userName}</p>
                       <p className={`text-xs truncate ${selectedChat?.userId === chat.userId ? 'text-slate-400' : 'text-slate-500'}`}>{chat.lastMessage}</p>
                    </div>
                 </button>
               ))
             )}
          </div>
       </div>

       {/* Chat Area */}
       <div className="flex-1 flex flex-col bg-slate-50">
          {selectedChat ? (
            <>
              <header className="p-6 bg-white border-b border-slate-100 flex items-center justify-between px-10">
                 <div className="flex items-center gap-4 flex-row-reverse">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400">
                       {selectedChat.userName.charAt(0)}
                    </div>
                    <div className="text-right">
                       <p className="font-black">{selectedChat.userName}</p>
                       <p className="text-[10px] text-slate-400 font-black">عميل المنصة</p>
                    </div>
                 </div>
              </header>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar">
                 {messages.map((m, i) => (
                   <div key={i} className={`flex ${m.role === 'customer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-5 rounded-[2rem] text-sm font-bold shadow-sm ${m.role === 'customer' ? 'bg-white text-slate-700' : 'bg-[#00E5FF] text-slate-900'}`}>
                         {m.content}
                      </div>
                   </div>
                 ))}
              </div>
              <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
                 <input 
                   value={inputText}
                   onChange={e => setInputText(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleSend()}
                   placeholder="اكتب ردك هنا..."
                   className="flex-1 bg-slate-50 rounded-2xl py-4 px-8 font-bold outline-none border-none text-right"
                 />
                 <button onClick={handleSend} className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-black transition-all">
                    <Send className="rotate-180" size={24} />
                 </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
               <MessageCircle size={80} className="mb-6 opacity-10" />
               <p className="text-2xl font-black">اختر محادثة للرد عليها</p>
            </div>
          )}
       </div>
    </div>
  );
};

const ReservationsTab: React.FC<{ reservations: Reservation[], onUpdateStatus: (id: string, s: string) => void }> = ({ reservations, onUpdateStatus }) => (
  <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-10 flex-row-reverse">
       <h3 className="text-3xl font-black">طلبات الحجز النشطة</h3>
       <span className="bg-amber-100 text-amber-600 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">{reservations.length} طلب ينتظر الاستلام</span>
    </div>
    <div className="space-y-6">
      {reservations.length === 0 ? (
        <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem] text-slate-300">
           <CalendarCheck size={64} className="mx-auto mb-6 opacity-10" />
           <p className="font-black text-xl">لا توجد طلبات حجز حالياً.</p>
        </div>
      ) : (
        reservations.map(res => (
          <div key={res.id} className="bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-8 hover:bg-slate-50 transition-all group">
             <div className="flex items-center gap-8 flex-row-reverse w-full lg:w-auto">
                <img src={res.itemImage} className="w-24 h-24 rounded-3xl object-cover shadow-xl group-hover:rotate-3 transition-transform" />
                <div className="text-right">
                   <p className="font-black text-2xl text-slate-900 mb-2">{res.itemName}</p>
                   <div className="space-y-1">
                      <p className="text-slate-500 font-black text-sm flex items-center justify-end gap-2"><User size={14} /> العميل: {res.customerName}</p>
                      <p className="text-slate-400 font-bold text-sm flex items-center justify-end gap-2"><Phone size={14} /> {res.customerPhone}</p>
                   </div>
                   <p className="text-[10px] text-[#00E5FF] font-black mt-3 uppercase tracking-tighter flex items-center justify-end gap-1"><Clock size={12} /> {new Date(res.createdAt).toLocaleString('ar-EG')}</p>
                </div>
             </div>
             <div className="flex flex-col md:flex-row items-center gap-6 w-full lg:w-auto">
                <div className="text-right md:text-left px-8">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المبلغ المطلوب</p>
                   <p className="text-3xl font-black text-slate-900">ج.م {res.itemPrice}</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                   <button onClick={() => onUpdateStatus(res.id, 'completed')} className="flex-1 md:w-40 py-5 bg-green-500 text-white rounded-2xl font-black text-xs hover:bg-green-600 transition-all shadow-lg shadow-green-100">تم الاستلام</button>
                   <button onClick={() => onUpdateStatus(res.id, 'expired')} className="flex-1 md:w-40 py-5 bg-white border border-slate-200 text-red-500 rounded-2xl font-black text-xs hover:bg-red-50 transition-all">إلغاء الحجز</button>
                </div>
             </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const SalesTab: React.FC<{ sales: any[] }> = ({ sales }) => (
  <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-10 flex-row-reverse">
       <h3 className="text-3xl font-black">سجل الفواتير والعمليات</h3>
       <div className="flex items-center gap-2 bg-green-50 text-green-600 px-6 py-2 rounded-full font-black text-xs">
          <CheckCircle2 size={16} /> {sales.length} عملية ناجحة
       </div>
    </div>
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-right border-collapse min-w-[800px]">
         <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
               <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم الفاتورة</th>
               <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">التاريخ والوقت</th>
               <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">التعداد</th>
               <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">التفاصيل</th>
            </tr>
         </thead>
         <tbody>
            {sales.map(sale => (
               <tr key={sale.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 font-black text-slate-900">#{sale.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-6 text-slate-500 font-bold text-sm">{new Date(sale.created_at).toLocaleString('ar-EG')}</td>
                  <td className="p-6 text-slate-500 font-black text-sm">{sale.items?.length || 0} صنف</td>
                  <td className="p-6">
                     <span className="text-xl font-black text-[#00E5FF]">ج.م {sale.total.toLocaleString()}</span>
                  </td>
                  <td className="p-6 text-left">
                     <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><Eye size={18} /></button>
                  </td>
               </tr>
            ))}
         </tbody>
      </table>
    </div>
  </div>
);

const PromotionsTab: React.FC<{offers: Offer[], onDelete: (id: string) => void}> = ({offers, onDelete}) => (
  <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-10 flex-row-reverse">
       <h3 className="text-3xl font-black">مركز الترويج الفعال</h3>
       <span className="bg-purple-100 text-[#BD00FF] px-6 py-2 rounded-full font-black text-xs uppercase">{offers.length} عروض نشطة</span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
       {offers.length === 0 ? (
         <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem] text-slate-300 font-bold">لا توجد عروض ترويجية نشطة حالياً.</div>
       ) : (
         offers.map(offer => (
           <div key={offer.id} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col gap-6 group hover:shadow-xl transition-all">
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-sm">
                 <img src={offer.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                 <div className="absolute top-4 left-4 bg-[#BD00FF] text-white px-4 py-1.5 rounded-xl font-black text-sm shadow-xl shadow-purple-500/20">-{offer.discount}%</div>
              </div>
              <div className="text-right">
                 <p className="font-black text-xl text-slate-900 mb-1">{offer.title}</p>
                 <div className="flex items-center justify-end gap-4">
                    <span className="text-slate-300 line-through font-bold">ج.م {offer.oldPrice}</span>
                    <span className="text-[#BD00FF] font-black text-2xl">ج.م {offer.newPrice}</span>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button className="flex-1 py-4 bg-white border border-slate-100 rounded-2xl font-black text-xs text-slate-400">تعديل التصميم</button>
                 <button onClick={() => onDelete(offer.id)} className="flex-1 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all">إيقاف العرض</button>
              </div>
           </div>
         ))
       )}
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-10 py-5 rounded-full font-black text-xs transition-all whitespace-nowrap ${active ? 'bg-slate-900 text-white shadow-[0_15px_30px_rgba(0,0,0,0.15)]' : 'text-slate-400 hover:text-slate-900 hover:bg-white'}`}>
    {icon} <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-right flex flex-col items-end group hover:shadow-xl transition-all">
    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl mb-8 group-hover:rotate-6 transition-transform ${color === 'cyan' ? 'bg-cyan-50 text-[#00E5FF]' : 'bg-slate-50 text-slate-400'}`}>
      {icon}
    </div>
    <span className="text-slate-400 font-black text-xs uppercase tracking-widest mb-2">{label}</span>
    <span className="text-4xl font-black tracking-tighter text-slate-900">{value}</span>
  </div>
);

const ProductsTab: React.FC<{products: Product[], onAdd: () => void, onMakeOffer: (p: Product) => void, onDelete: (id: string) => void}> = ({products, onAdd, onMakeOffer, onDelete}) => (
  <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-12 flex-row-reverse">
       <h3 className="text-3xl font-black">المخزون والمنتجات</h3>
       <button onClick={onAdd} className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm flex items-center gap-3 shadow-2xl hover:bg-black transition-all"><Plus size={24} /> إضافة صنف جديد</button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
       {products.map(p => (
         <div key={p.id} className="group relative bg-slate-50/50 p-5 rounded-[2.5rem] border border-transparent hover:border-[#00E5FF] hover:bg-white transition-all hover:shadow-2xl">
            <div className="aspect-square rounded-[2rem] overflow-hidden mb-6 bg-white shadow-sm">
               <img src={p.imageUrl || (p as any).image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1s]" />
            </div>
            <h4 className="font-black text-base mb-2 truncate text-right text-slate-800">{p.name}</h4>
            <div className="flex items-center justify-between flex-row-reverse">
               <span className="text-[#00E5FF] font-black text-xl">ج.م {p.price}</span>
               <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black text-slate-400">م: {p.stock}</span>
            </div>
            <div className="absolute top-4 left-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
               <button onClick={() => onMakeOffer(p)} className="p-3 bg-white rounded-xl shadow-xl text-[#BD00FF] hover:scale-110 transition-transform"><Tag size={20} /></button>
               <button onClick={() => onDelete(p.id)} className="p-3 bg-white rounded-xl shadow-xl text-red-500 hover:scale-110 transition-transform"><Trash2 size={20} /></button>
            </div>
         </div>
       ))}
    </div>
  </div>
);

const GrowthTab: React.FC<{shop: any, analytics: any, products: Product[]}> = ({shop, analytics, products}) => {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const generateGrowth = async () => {
    setLoading(true); setInsight('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `أنا مساعد أعمال "تست". محل "${shop.name}" لديه إيرادات ج.م ${analytics.totalRevenue}. عدد المنتجات ${products.length}.
      حلل الأداء بلهجة مصرية روشة وقدم: 1) نصيحة نمو واحدة. 2) نص تسويقي جذاب لأهم منتج.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 5000 } }
      });
      setInsight(response.text || '');
    } catch (e) {
      addToast('فشل في الوصول للذكاء الاصطناعي', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
       <div className="bg-slate-900 p-12 md:p-24 rounded-[4rem] text-white text-right relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 p-20 opacity-10 pointer-events-none group"><Zap size={300} className="text-[#00E5FF] animate-pulse" /></div>
          <Sparkles className="w-20 h-20 text-[#00E5FF] mb-10" />
          <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9]">مستقبلك يبدأ <br/><span className="text-[#00E5FF]">بالشعاع الذكي.</span></h2>
          <p className="text-slate-400 font-bold mb-12 max-w-lg text-xl leading-relaxed">استخدم قوة Gemini لتحليل أداء متجرك وكتابة نصوص تسويقية ذكية لوسائل التواصل الاجتماعي في ثوانٍ.</p>
          <button onClick={generateGrowth} disabled={loading} className="px-16 py-7 bg-white text-black rounded-3xl font-black text-2xl hover:bg-[#00E5FF] transition-all flex items-center justify-center gap-5 shadow-[0_0_60px_rgba(255,255,255,0.15)] relative z-10">
            {loading ? <Loader2 className="animate-spin" size={28} /> : <Wand2 className="text-[#BD00FF]" size={28} />}
            {loading ? 'جاري التحليل واستخراج الأفكار...' : 'توليد أفكار النمو والتسويق'}
          </button>
       </div>
       <AnimatePresence>
          {insight && (
            <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl text-right">
               <div className="flex gap-6 items-start mb-8 flex-row-reverse">
                  <div className="w-16 h-16 rounded-3xl bg-cyan-50 text-[#00E5FF] flex items-center justify-center shrink-0 shadow-sm"><MessageSquare size={28} /></div>
                  <div className="text-xl font-bold text-slate-700 leading-loose whitespace-pre-wrap">{insight}</div>
               </div>
               <button onClick={() => {navigator.clipboard.writeText(insight); addToast('تم نسخ التحليل بنجاح!', 'info');}} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center gap-3"><Megaphone size={18} /> نسخ النص التسويقي</button>
            </MotionDiv>
          )}
       </AnimatePresence>
    </div>
  );
};

const OverviewTab: React.FC<{shop: any, analytics: any, notifications: any[]}> = ({shop, analytics, notifications}) => (
  <div className="space-y-12">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
      <StatCard label="المتابعين" value={shop.followers?.toLocaleString() || '0'} icon={<Users size={32} />} color="cyan" />
      <StatCard label="زيارات المتجر" value={shop.visitors?.toLocaleString() || '0'} icon={<Eye size={32} />} color="cyan" />
      <StatCard label="مبيعات اليوم" value={`${analytics.salesCountToday}`} icon={<ShoppingCart size={32} />} color="slate" />
      <StatCard label="إيرادات اليوم" value={`ج.م ${analytics.revenueToday}`} icon={<DollarSign size={32} />} color="cyan" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
       <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-12 flex-row-reverse">
             <h3 className="text-3xl font-black text-slate-900">رادار المبيعات</h3>
             <div className="flex items-center gap-2 text-green-500 font-black text-sm px-4 py-1 bg-green-50 rounded-full"><TrendingUp size={16} /> نمو مستمر</div>
          </div>
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 'bold', fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.15)', direction: 'rtl', padding: '20px' }} />
                <Area type="monotone" dataKey="sales" stroke="#00E5FF" strokeWidth={6} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
       </div>

       <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10 flex-row-reverse">
            <h3 className="text-2xl font-black text-slate-900">آخر التنبيهات</h3>
            <div className="w-10 h-10 bg-cyan-50 rounded-full flex items-center justify-center text-[#00E5FF]"><Bell size={20} /></div>
          </div>
          <div className="space-y-8">
             {notifications.length === 0 ? (
               <div className="py-24 text-center text-slate-200">
                  <Bell size={48} className="mx-auto mb-4 opacity-10" />
                  <p className="font-bold">لا توجد عمليات مؤخراً.</p>
               </div>
             ) : (
               notifications.map(n => <ActivityItem key={n.id} n={n} />)
             )}
          </div>
          <button className="w-full mt-10 py-5 bg-slate-50 text-slate-400 font-black text-xs rounded-2xl hover:bg-slate-100 transition-all">مشاهدة كافة الإشعارات</button>
       </div>
    </div>
  </div>
);

const ActivityItem: React.FC<{n: any}> = ({n}) => (
  <div className="flex items-center gap-6 flex-row-reverse group cursor-pointer">
     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
       n.type === 'sale' ? 'bg-green-50 text-green-500' : 
       n.type === 'reservation' ? 'bg-amber-50 text-amber-500' : 'bg-cyan-50 text-cyan-500'
     }`}>
        {n.type === 'sale' ? <ShoppingCart size={24} /> : n.type === 'reservation' ? <CalendarCheck size={24} /> : <Users size={24} />}
     </div>
     <div className="flex-1 text-right">
        <p className="font-black text-base text-slate-800 mb-1 leading-tight">{n.title}</p>
        <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400 font-black uppercase">
          <Clock size={12} /> {new Date(n.created_at).toLocaleTimeString('ar-EG')}
        </div>
     </div>
     <ChevronRight size={16} className="text-slate-200 rotate-180" />
  </div>
);

const SettingsTab: React.FC<{shop: any}> = ({shop}) => (
  <div className="bg-white p-12 md:p-16 rounded-[3.5rem] border border-slate-100 shadow-sm">
     <h3 className="text-3xl font-black mb-12">إعدادات المتجر العامة</h3>
     <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">الاسم التجاري الرسمي</label>
           <input className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none focus:ring-2 focus:ring-[#00E5FF]/20 focus:bg-white transition-all" defaultValue={shop.name} />
        </div>
        <div className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">العنوان / المدينة</label>
           <input className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none focus:ring-2 focus:ring-[#00E5FF]/20 focus:bg-white transition-all" defaultValue={shop.city} />
        </div>
        <div className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">نوع المتجر</label>
           <select className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none appearance-none" defaultValue={shop.category}>
              <option value="RETAIL">محل تجاري</option>
              <option value="RESTAURANT">مطعم / كافيه</option>
           </select>
        </div>
        <div className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">رقم الواتساب للتواصل</label>
           <input className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none" placeholder="01x xxxx xxxx" />
        </div>
     </div>
     <div className="mt-12 flex justify-end">
        <button className="px-16 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-black transition-all shadow-2xl">حفظ كافة التغييرات السيادية</button>
     </div>
  </div>
);

const CreateOfferModal: React.FC<{product: Product | null, onClose: () => void, shopId: string}> = ({product, onClose, shopId}) => {
  const [discount, setDiscount] = useState('20');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  if (!product) return null;
  const newPrice = Math.round(product.price * (1 - Number(discount) / 100));
  const handleCreate = async () => {
    setLoading(true);
    try {
      await ApiService.createOffer({
        productId: product.id,
        shopId: shopId,
        title: product.name,
        description: `عرض خاص وحصري على ${product.name}`,
        discount: Number(discount),
        oldPrice: product.price,
        newPrice: newPrice,
        imageUrl: product.imageUrl || (product as any).image_url
      });
      addToast('تم نشر العرض في الصفحة الرئيسية!', 'success');
      onClose();
    } catch (e) {
      addToast('فشل في إنشاء العرض', 'error');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
      <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <MotionDiv initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-md rounded-[3rem] p-10 text-right shadow-2xl">
        <h2 className="text-3xl font-black mb-8">إنشاء عرض فلاش <Zap className="text-[#BD00FF] inline" /></h2>
        <div className="space-y-6">
           <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
              <img src={product.imageUrl || (product as any).image_url} className="w-16 h-16 rounded-xl object-cover" />
              <div className="text-right">
                <p className="font-black text-sm">{product.name}</p>
                <p className="text-slate-400 font-bold text-xs">ج.م {product.price}</p>
              </div>
           </div>
           <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full bg-slate-50 rounded-2xl p-6 text-3xl font-black text-center" />
           <div className="p-6 bg-purple-50 rounded-2xl text-center border border-purple-100">
              <p className="text-[10px] font-black text-purple-400 uppercase mb-2">السعر بعد الخصم</p>
              <p className="text-4xl font-black text-[#BD00FF]">ج.م {newPrice}</p>
           </div>
           <button onClick={handleCreate} disabled={loading} className="w-full py-5 bg-[#BD00FF] text-white rounded-2xl font-black text-xl shadow-xl">{loading ? <Loader2 className="animate-spin mx-auto" /> : 'نشر العرض الآن'}</button>
        </div>
      </MotionDiv>
    </div>
  );
};

const AddProductModal: React.FC<{ isOpen: boolean, onClose: () => void, shopId: string }> = ({ isOpen, onClose, shopId }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [cat, setCat] = useState('عام');
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        addToast('الصورة كبيرة جداً، يرجى اختيار صورة أقل من 2 ميجابايت', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!imageFile) {
      addToast('يرجى اختيار صورة للمنتج أولاً', 'info');
      return;
    }
    setLoading(true);
    try {
      await ApiService.addProduct({ 
        shopId, 
        name, 
        price: Number(price), 
        stock: Number(stock), 
        category: cat, 
        imageUrl: imageFile 
      });
      addToast('تمت إضافة المنتج بنجاح!', 'success');
      // Reset form
      setName(''); setPrice(''); setStock(''); setCat('عام'); setImageFile(null);
      onClose();
    } catch (err) {
      addToast('فشل في إضافة المنتج', 'error');
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
      <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <MotionDiv initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="relative bg-white w-full max-w-2xl rounded-[3rem] p-8 md:p-12 text-right shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-3xl font-black">إضافة صنف جديد</h2>
           <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
           {/* Image Upload Area */}
           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-4">صورة المنتج</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-square md:aspect-video rounded-[2.5rem] border-4 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group ${imageFile ? 'border-transparent' : 'border-slate-100 hover:border-[#00E5FF] hover:bg-cyan-50'}`}
              >
                 {imageFile ? (
                   <>
                     <img src={imageFile} className="w-full h-full object-cover" alt="preview" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white/90 px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2">
                           <Upload size={16} /> تغيير الصورة
                        </div>
                     </div>
                   </>
                 ) : (
                   <div className="text-center p-8">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 group-hover:text-[#00E5FF] transition-colors">
                         <Upload size={32} />
                      </div>
                      <p className="font-black text-slate-900 mb-1">اضغط لرفع صورة</p>
                      <p className="text-xs text-slate-400 font-bold">JPG, PNG (بحد أقصى 2 ميجا)</p>
                   </div>
                 )}
                 <input 
                   type="file" 
                   hidden 
                   accept="image/*" 
                   ref={fileInputRef} 
                   onChange={handleImageChange} 
                 />
              </div>
           </div>

           <div className="space-y-6">
             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-4">اسم الصنف</label>
                <input required placeholder="مثلاً: قميص أبيض قطن" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent rounded-[1.5rem] py-5 px-8 font-black text-lg text-right outline-none focus:bg-white focus:border-[#00E5FF]/20 transition-all" />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-4">السعر (ج.م)</label>
                   <input required type="number" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent rounded-[1.5rem] py-5 px-8 font-black text-lg text-right outline-none focus:bg-white focus:border-[#00E5FF]/20 transition-all" />
                </div>
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-4">الكمية المتوفرة</label>
                   <input required type="number" placeholder="1" value={stock} onChange={e => setStock(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent rounded-[1.5rem] py-5 px-8 font-black text-lg text-right outline-none focus:bg-white focus:border-[#00E5FF]/20 transition-all" />
                </div>
             </div>

             <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-4">القسم</label>
                <input placeholder="مثلاً: ملابس صيفية" value={cat} onChange={e => setCat(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent rounded-[1.5rem] py-5 px-8 font-black text-lg text-right outline-none focus:bg-white focus:border-[#00E5FF]/20 transition-all" />
             </div>
           </div>

           <button 
             type="submit" 
             disabled={loading}
             className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-2xl hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-4 mt-4 disabled:bg-slate-200"
           >
             {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} className="text-[#00E5FF]" />}
             {loading ? 'جاري الحفظ...' : 'تأكيد وحفظ الصنف'}
           </button>
        </form>
      </MotionDiv>
    </div>
  );
};

// Gallery Tab Component
const GalleryTab: React.FC<{ 
  images: ShopGallery[], 
  onImagesChange: (images: ShopGallery[]) => void, 
  shopId: string, 
  primaryColor: string 
}> = ({ images, onImagesChange, shopId, primaryColor }) => {
  return (
    <GalleryManager 
      shopId={shopId}
      images={images}
      onImagesChange={onImagesChange}
      primaryColor={primaryColor}
    />
  );
};

export default MerchantDashboard;
