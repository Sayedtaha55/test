
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
import { ApiService } from '@/services/api.service';
import * as ReactRouterDOM from 'react-router-dom';
import { Product, Reservation, Offer, ShopGallery } from '@/types';
import POSSystem from './POSSystem';
import PageBuilder from './PageBuilder';
import GalleryManager from './GalleryManager';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { useToast } from '@/components';

const { useSearchParams, useNavigate } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

type TabType = 'overview' | 'pos' | 'builder' | 'products' | 'reservations' | 'sales' | 'promotions' | 'growth' | 'chats' | 'settings' | 'reports' | 'customers' | 'gallery';

const MerchantDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabType) || 'overview';
  const impersonateShopId = searchParams.get('impersonateShopId');
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

  const setTab = (tab: TabType) => {
    const next = new URLSearchParams(searchParams);
    if (!tab || tab === 'overview') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next as any, { replace: true } as any);
  };

  const savedUserForView = (() => {
    try {
      return JSON.parse(localStorage.getItem('ray_user') || '{}');
    } catch {
      return {};
    }
  })();
  const isAdminView = String(savedUserForView?.role || '').toLowerCase() === 'admin';
  const adminTargetShopId = isAdminView && impersonateShopId ? impersonateShopId : undefined;

  const syncData = async () => {
    const savedUserStr = localStorage.getItem('ray_user');
    if (!savedUserStr) {
      navigate('/login');
      return;
    }
    const savedUser = JSON.parse(savedUserStr);
    const role = String(savedUser?.role || '').toLowerCase();
    if (role !== 'merchant' && !(role === 'admin' && impersonateShopId)) {
      addToast('هذه الصفحة للتجار فقط', 'error');
      navigate('/login');
      return;
    }
    const effectiveShopId = (savedUser?.role === 'admin' && impersonateShopId) ? impersonateShopId : savedUser.shopId;
    
    try {
      const myShop = (savedUser?.role === 'admin' && impersonateShopId)
        ? await ApiService.getShopAdminById(effectiveShopId)
        : await ApiService.getMyShop();
      setCurrentShop(myShop);

      const now = new Date();
      const salesFrom = new Date(now);
      salesFrom.setFullYear(salesFrom.getFullYear() - 1);
      const analyticsFrom = new Date(now);
      analyticsFrom.setDate(analyticsFrom.getDate() - 30);

      const [prodData, resData, salesData, notifData, analyticsData, allOffers, galleryData] = await Promise.all([
        ApiService.getProducts(myShop.id),
        ApiService.getReservations(myShop.id),
        ApiService.getAllOrders({ shopId: myShop.id, from: salesFrom.toISOString(), to: now.toISOString() }),
        ApiService.getNotifications(myShop.id),
        ApiService.getShopAnalytics(myShop.id, { from: analyticsFrom.toISOString(), to: now.toISOString() }),
        ApiService.getOffers(),
        ApiService.getShopGallery(myShop.id)
      ]);

      setProducts(prodData);
      setReservations(resData);
      setSales(salesData.filter((s: any) => s.shop_id === myShop.id || s.shopId === myShop.id));
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

  useEffect(() => {
    const onOrdersUpdated = () => {
      syncData();
    };
    window.addEventListener('orders-updated', onOrdersUpdated);
    return () => {
      window.removeEventListener('orders-updated', onOrdersUpdated);
    };
  }, [navigate, activeTab]);

  useEffect(() => {
    const onDbUpdate = () => {
      syncData();
    };
    window.addEventListener('ray-db-update', onDbUpdate);
    return () => {
      window.removeEventListener('ray-db-update', onDbUpdate);
    };
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
      
      // If reservation is completed, convert to customer
      if (status === 'completed') {
        const reservation = reservations.find(r => r.id === id);
        if (reservation) {
          await ApiService.convertReservationToCustomer({
            customerName: reservation.customerName,
            customerPhone: reservation.customerPhone,
            customerEmail: reservation.customerEmail || '',
            shopId: currentShop.id,
            firstPurchaseAmount: reservation.itemPrice,
            firstPurchaseItem: reservation.itemName
          });
          addToast('تم تحويل العميل لقاعدة العملاء بنجاح', 'success');
        }
      }
      
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
      case 'promotions': return <PromotionsTab offers={activeOffers} onDelete={(id) => ApiService.deleteOffer(id).then(syncData)} onCreate={() => setTab('products')} />;
      case 'reservations': return <ReservationsTab reservations={reservations} onUpdateStatus={handleUpdateResStatus} />;
      case 'sales': return <SalesTab sales={sales} />;
      case 'chats': return <ChatsTab shopId={currentShop.id} />;
      case 'growth': return <GrowthTab shop={currentShop} analytics={analytics} products={products} />;
      case 'reports': return <ReportsTab analytics={analytics} sales={sales} />;
      case 'customers': return <CustomersTab shopId={currentShop.id} />;
      case 'settings': return <SettingsTab shop={currentShop} onSaved={syncData} adminShopId={adminTargetShopId} />;
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
             <img src={currentShop.logoUrl || currentShop.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200'} className="w-20 h-20 md:w-32 md:h-32 rounded-[2.5rem] object-cover shadow-2xl transition-transform group-hover:scale-105" alt="logo" />
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
           <button onClick={() => setTab('pos')} className="flex-1 md:flex-none px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl"><Smartphone size={20} /> الكاشير الذكي</button>
        </div>
      </div>

      {/* Enhanced Navigation */}
      <div className="hidden gap-2 p-2 bg-slate-100/60 backdrop-blur-xl rounded-[2.5rem] border border-white/40 overflow-x-auto no-scrollbar sticky top-24 z-40 shadow-inner">
        <TabButton active={activeTab === 'overview'} onClick={() => setTab('overview')} icon={<TrendingUp size={18} />} label="نظرة عامة" />
        <TabButton active={activeTab === 'gallery'} onClick={() => setTab('gallery')} icon={<Camera size={18} />} label="معرض الصور" />
        <TabButton active={activeTab === 'reports'} onClick={() => setTab('reports')} icon={<BarChart3 size={18} />} label="التقارير" />
        <TabButton active={activeTab === 'customers'} onClick={() => setTab('customers')} icon={<Users size={18} />} label="العملاء" />
        <TabButton active={activeTab === 'products'} onClick={() => setTab('products')} icon={<Package size={18} />} label="المخزون" />
        <TabButton active={activeTab === 'promotions'} onClick={() => setTab('promotions')} icon={<Megaphone size={18} />} label="العروض" />
        <TabButton active={activeTab === 'reservations'} onClick={() => setTab('reservations')} icon={<CalendarCheck size={18} />} label="الحجوزات" />
        <TabButton active={activeTab === 'chats'} onClick={() => setTab('chats')} icon={<MessageCircle size={18} />} label="المحادثات" />
        <TabButton active={activeTab === 'sales'} onClick={() => setTab('sales')} icon={<CreditCard size={18} />} label="المبيعات" />
        <TabButton active={activeTab === 'growth'} onClick={() => setTab('growth')} icon={<Sparkles size={18} />} label="نمو AI" />
        <TabButton active={activeTab === 'settings'} onClick={() => setTab('settings')} icon={<Settings size={18} />} label="الإعدادات" />
      </div>

      <AnimatePresence mode="wait">
        <MotionDiv key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          {activeTab === 'pos' ? <POSSystem shopId={currentShop.id} onClose={() => setTab('overview')} /> : 
           activeTab === 'builder' ? <PageBuilder onClose={() => setTab('overview')} /> : 
           renderContent()}
        </MotionDiv>
      </AnimatePresence>

      <AddProductModal isOpen={showProductModal} onClose={() => { setShowProductModal(false); syncData(); }} shopId={currentShop.id} />
      <CreateOfferModal product={showOfferModal} onClose={() => { setShowOfferModal(null); syncData(); }} shopId={currentShop.id} />
    </div>
  );
};

// --- Overview Tab ---
const OverviewTabLegacy: React.FC<{ shop: any, analytics: any, notifications: any[] }> = ({ shop, analytics, notifications }) => {
  const salesCountToday = Math.floor(Math.random() * 50) + 10;
  const revenueToday = Math.floor(Math.random() * 5000) + 1000;
  
  const chartData = [
    { name: 'الأحد', sales: 4000 },
    { name: 'الإثنين', sales: 3000 },
    { name: 'الثلاثاء', sales: 5000 },
    { name: 'الأربعاء', sales: 2780 },
    { name: 'الخميس', sales: 6890 },
    { name: 'الجمعة', sales: 8390 },
    { name: 'السبت', sales: 5490 },
  ];

  return (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="إجمالي الإيرادات" value={`ج.م ${analytics?.totalRevenue?.toLocaleString() || 0}`} icon={<DollarSign size={32} />} color="cyan" />
        <StatCard label="مبيعات اليوم" value={`${salesCountToday}`} icon={<ShoppingCart size={32} />} color="slate" />
        <StatCard label="إيرادات اليوم" value={`ج.م ${revenueToday}`} icon={<DollarSign size={32} />} color="cyan" />
        <StatCard label="العملاء النشطين" value={analytics?.totalUsers || 0} icon={<Users size={32} />} color="slate" />
      </div>

      {/* Sales Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
       <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-12 flex-row-reverse">
             <h3 className="text-3xl font-black text-slate-900">رادار المبيعات</h3>
             <div className="flex items-center gap-2 text-green-500 font-black text-sm px-4 py-1 bg-green-50 rounded-full"><TrendingUp size={16} /> نمو مستمر</div>
          </div>
          <div className="h-[450px] w-full min-w-[300px] min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={400}>
              <AreaChart data={chartData}>
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

       {/* Recent Notifications */}
       <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-10 flex-row-reverse">
            <h3 className="text-2xl font-black text-slate-900">آخر التنبيهات</h3>
            <div className="w-10 h-10 bg-cyan-50 rounded-full flex items-center justify-center text-[#00E5FF]"><Bell size={20} /></div>
          </div>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <p className="text-slate-300 font-black text-center py-8">لا توجد تنبيهات جديدة</p>
            ) : (
              notifications.slice(0, 5).map((notif, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                  <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-600 font-black text-xs mt-1">
                    {i + 1}
                  </div>
                  <div className="flex-1 text-right">
                    <p className="font-black text-sm text-slate-700">{notif.message || 'تنبيه جديد'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('ar-EG') : 'الآن'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
       </div>
      </div>
    </div>
  );
};

// --- New: Reports Tab ---
const ReportsTab: React.FC<{ analytics: any, sales: any[] }> = ({ analytics, sales }) => {
  const [range, setRange] = useState<'30d' | '6m' | '12m'>('6m');

  const safeSales = Array.isArray(sales) ? sales : [];
  const safeAnalytics = analytics || {};

  const now = new Date();
  const start = new Date(now);
  if (range === '30d') {
    start.setDate(start.getDate() - 30);
  } else if (range === '12m') {
    start.setFullYear(start.getFullYear() - 1);
  } else {
    start.setMonth(start.getMonth() - 6);
  }

  const salesInRange = safeSales.filter((s: any) => {
    const ts = new Date(s.created_at || s.createdAt || 0).getTime();
    return ts >= start.getTime() && ts <= now.getTime();
  });

  const rangeMonths = range === '12m' ? 12 : 6;
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const monthlyBuckets: Record<string, number> = {};

  if (range !== '30d') {
    const mStart = new Date(now);
    mStart.setDate(1);
    mStart.setHours(0, 0, 0, 0);
    mStart.setMonth(mStart.getMonth() - (rangeMonths - 1));

    for (let i = 0; i < rangeMonths; i += 1) {
      const d = new Date(mStart);
      d.setMonth(mStart.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyBuckets[key] = 0;
    }

    for (const s of salesInRange) {
      const dt = new Date(s.created_at || s.createdAt || 0);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (typeof monthlyBuckets[key] === 'number') {
        monthlyBuckets[key] += Number(s.total || 0);
      }
    }
  }

  const monthlyData = range === '30d'
    ? []
    : Object.keys(monthlyBuckets).sort().map((key) => {
      const [y, m] = key.split('-');
      const monthIndex = Math.max(0, Math.min(11, Number(m) - 1));
      return {
        name: monthNames[monthIndex],
        revenue: Math.round(monthlyBuckets[key] || 0),
      };
    });

  const totalRevenue = salesInRange.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
  const totalOrders = salesInRange.length;
  const avgBasket = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

  const visitors = Number(safeAnalytics.visitorsCount ?? safeAnalytics.visitors ?? 0);
  const conversion = visitors > 0 ? (totalOrders / visitors) * 100 : 0;

  const prevStart = new Date(start);
  const prevEnd = new Date(start);
  if (range === '30d') {
    prevStart.setDate(prevStart.getDate() - 30);
  } else if (range === '12m') {
    prevStart.setFullYear(prevStart.getFullYear() - 1);
  } else {
    prevStart.setMonth(prevStart.getMonth() - 6);
  }

  const prevSales = safeSales.filter((s: any) => {
    const ts = new Date(s.created_at || s.createdAt || 0).getTime();
    return ts >= prevStart.getTime() && ts < prevEnd.getTime();
  });

  const prevRevenue = prevSales.reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
  const prevOrders = prevSales.length;
  const prevAvgBasket = prevOrders > 0 ? (prevRevenue / prevOrders) : 0;
  const prevConversion = visitors > 0 ? (prevOrders / visitors) * 100 : 0;

  const pctChange = (cur: number, prev: number) => {
    if (!prev) {
      if (!cur) return 0;
      return 100;
    }
    return ((cur - prev) / prev) * 100;
  };

  const avgBasketGrowth = pctChange(avgBasket, prevAvgBasket);
  const conversionGrowth = pctChange(conversion, prevConversion);
  const revenueGrowth = pctChange(totalRevenue, prevRevenue);

  return (
    <div className="space-y-10">
      <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-12 flex-row-reverse">
          <h3 className="text-3xl font-black">أداء الإيرادات الشهرية</h3>
          <div className="flex gap-2">
            <button onClick={() => setRange('30d')} className={`px-4 py-2 rounded-xl text-xs font-bold ${range === '30d' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'}`}>٣٠ يوم</button>
            <button onClick={() => setRange('6m')} className={`px-4 py-2 rounded-xl text-xs font-bold ${range === '6m' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'}`}>٦ شهور</button>
            <button onClick={() => setRange('12m')} className={`px-4 py-2 rounded-xl text-xs font-bold ${range === '12m' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600'}`}>١٢ شهر</button>
          </div>
        </div>
        {range === '30d' ? (
          <div className="py-24 text-center text-slate-300 font-bold">اختر ٦ شهور أو ١٢ شهر لعرض الرسم الشهري</div>
        ) : (
          <div className="h-[450px] w-full min-w-[300px] min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={400}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#94a3b8' }} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="revenue" fill="#00E5FF" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ReportSummaryCard label="متوسط قيمة السلة" value={`ج.م ${Math.round(avgBasket).toLocaleString('ar-EG')}`} growth={avgBasketGrowth} />
        <ReportSummaryCard label="نسبة التحويل" value={`${conversion.toFixed(1)}٪`} growth={conversionGrowth} />
        <ReportSummaryCard label="إيراد الفترة" value={`ج.م ${Math.round(totalRevenue).toLocaleString('ar-EG')}`} growth={revenueGrowth} />
      </div>
    </div>
  );
};

const ReportSummaryCard = ({ label, value, growth }: any) => {
  const growthNum = typeof growth === 'number' ? growth : Number(growth || 0);
  const sign = growthNum > 0 ? '+' : '';
  const text = `${sign}${Math.round(growthNum)}٪`;
  const cls = growthNum >= 0 ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50';
  return (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 text-right">
    <p className="text-slate-400 font-black text-xs uppercase mb-2">{label}</p>
    <div className="flex items-end justify-between flex-row-reverse">
       <span className="text-3xl font-black">{value}</span>
       <span className={`${cls} font-bold text-xs px-3 py-1 rounded-full`}>{text}</span>
    </div>
  </div>
  );
};

// --- New: Customers Tab ---
const CustomersTab: React.FC<{ shopId: string }> = ({ shopId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    loadCustomers();
  }, [shopId]);

  const loadCustomers = async () => {
    try {
      const data = await ApiService.getShopCustomers(shopId);
      setCustomers(data);
    } catch (e) {
      addToast('فشل تحميل بيانات العملاء', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const customer = customers.find(c => c.id === id);
      const newStatus = customer.status === 'active' ? 'blocked' : 'active';
      await ApiService.updateCustomerStatus(id, newStatus);
      setCustomers(prev => prev.map(c => 
        c.id === id ? { ...c, status: newStatus } : c
      ));
      addToast(`تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} حساب العميل`, 'success');
    } catch (e) {
      addToast('فشل تحديث حالة العميل', 'error');
    }
  };

  const sendPromotion = async (customerId: string) => {
    try {
      await ApiService.sendCustomerPromotion(customerId, shopId);
      addToast('تم إرسال العرض الترويجي بنجاح', 'success');
    } catch (e) {
      addToast('فشل إرسال العرض', 'error');
    }
  };

  const filtered = customers.filter(c => 
    c.name?.includes(searchTerm) || c.email?.includes(searchTerm) || c.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#00E5FF] w-8 h-8 ml-3" />
          <span className="text-slate-400 font-black">تحميل بيانات العملاء...</span>
        </div>
      </div>
    );
  }

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
        <table className="w-full text-right border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">العميل</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">رقم الهاتف</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي المشتريات</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">عدد الطلبات</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">آخر عملية</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">التحكم</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-slate-300 font-bold">
                  {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد بيانات عملاء حالياً. العملاء سيظهرون هنا عند تحويل الحجوزات المكتملة'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                <td className="p-6">
                   <div className="flex items-center gap-4 flex-row-reverse">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400">
                        {c.name?.charAt(0) || 'ع'}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{c.name || 'عميل غير محدد'}</p>
                        <p className="text-xs text-slate-400 font-bold">{c.email || 'لا يوجد بريد'}</p>
                        {c.convertedFromReservation && (
                          <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full font-black">محول من حجز</span>
                        )}
                      </div>
                   </div>
                </td>
                <td className="p-6 font-black text-slate-900">{c.phone || '---'}</td>
                <td className="p-6 font-black text-slate-900">ج.م {(c.totalSpent || 0).toLocaleString()}</td>
                <td className="p-6 font-black text-slate-500">{c.orders || 0} طلبات</td>
                <td className="p-6">
                  <div>
                    <p className="text-xs text-slate-400 font-black">
                      {c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toLocaleDateString('ar-EG') : '---'}
                    </p>
                    {c.firstPurchaseItem && (
                      <p className="text-[10px] text-slate-500">{c.firstPurchaseItem}</p>
                    )}
                  </div>
                </td>
                <td className="p-6 text-left">
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => sendPromotion(c.id)}
                      className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl font-black text-[10px] hover:bg-purple-600 hover:text-white transition-all"
                    >
                      <Megaphone size={12} />
                    </button>
                    <button 
                      onClick={() => toggleStatus(c.id)}
                      className={`px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                        c.status === 'active' ? 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-green-50 text-green-500 hover:bg-green-500 hover:text-white'
                      }`}
                    >
                      {c.status === 'active' ? <UserMinus size={12}/> : <UserCheck size={12}/>}
                    </button>
                  </div>
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
      if (selectedChat && newMsg.userId === selectedChat.userId) {
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
      userId: selectedChat.userId,
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

const ReservationsTab: React.FC<{ reservations: Reservation[], onUpdateStatus: (id: string, s: string) => void }> = ({ reservations, onUpdateStatus }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  
  const filteredReservations = reservations.filter(res => {
    if (filter === 'all') return true;
    if (filter === 'pending') return res.status === 'pending';
    if (filter === 'completed') return res.status === 'completed';
    return false;
  });

  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const completedCount = reservations.filter(r => r.status === 'completed').length;

  return (
  <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 flex-row-reverse">
       <div>
         <h3 className="text-3xl font-black">طلبات الحجز</h3>
         <p className="text-slate-400 font-black text-sm mt-2">عند تحويل الحجز لـ "تم الاستلام" سيتم إضافة العميل تلقائياً لقاعدة العملاء</p>
       </div>
       <div className="flex items-center gap-2">
         <span className="bg-amber-100 text-amber-600 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">{pendingCount} طلب ينتظر</span>
         <span className="bg-green-100 text-green-600 px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">{completedCount} منفذ</span>
       </div>
    </div>

    {/* Filter Tabs */}
    <div className="flex gap-2 mb-8 bg-slate-50 p-1 rounded-2xl w-fit">
      <button 
        onClick={() => setFilter('pending')}
        className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
          filter === 'pending' 
            ? 'bg-amber-500 text-white shadow-lg' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        الحجوزات الجديدة ({pendingCount})
      </button>
      <button 
        onClick={() => setFilter('completed')}
        className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
          filter === 'completed' 
            ? 'bg-green-500 text-white shadow-lg' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        الحجوزات المنفذة ({completedCount})
      </button>
      <button 
        onClick={() => setFilter('all')}
        className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
          filter === 'all' 
            ? 'bg-slate-900 text-white shadow-lg' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        الكل ({reservations.length})
      </button>
    </div>
    <div className="space-y-6">
      {filteredReservations.length === 0 ? (
        <div className="py-32 text-center border-2 border-dashed border-slate-100 rounded-[3rem] text-slate-300">
           <CalendarCheck size={64} className="mx-auto mb-6 opacity-10" />
           <p className="font-black text-xl">
             {filter === 'pending' ? 'لا توجد حجوزات جديدة حالياً.' : 
              filter === 'completed' ? 'لا توجد حجوزات منفذة حالياً.' : 
              'لا توجد حجوزات حالياً.'}
           </p>
        </div>
      ) : (
        filteredReservations.map(res => (
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
                {res.status === 'pending' ? (
                  <div className="flex gap-3 w-full md:w-auto">
                     <button onClick={() => onUpdateStatus(res.id, 'completed')} className="flex-1 md:w-40 py-5 bg-green-500 text-white rounded-2xl font-black text-xs hover:bg-green-600 transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2">
                       <UserCheck size={14} />
                       تم الاستلام
                     </button>
                     <button onClick={() => onUpdateStatus(res.id, 'expired')} className="flex-1 md:w-40 py-5 bg-white border border-slate-200 text-red-500 rounded-2xl font-black text-xs hover:bg-red-50 transition-all">إلغاء الحجز</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                     <span className="bg-green-100 text-green-600 px-4 py-2 rounded-xl font-black text-xs">تم الاستلام</span>
                     <span className="text-slate-400 font-black text-xs">{new Date(res.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
             </div>
          </div>
        ))
      )}
    </div>
  </div>
);

};

const SalesTabLegacy2: React.FC<{ sales: any[] }> = ({ sales }) => (
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

const PromotionsTabLegacy: React.FC<{offers: Offer[], onDelete: (id: string) => void}> = ({offers, onDelete}) => (
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

const StatCard = ({ label, value, icon, color }: any) => {
  const normalizedValue = (() => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number' && Number.isNaN(value)) return 0;
    if (typeof value === 'string') return value.replace(/\b(undefined|null)\b/g, '0');
    return value;
  })();

  return (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-right flex flex-col items-end group hover:shadow-xl transition-all">
    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl mb-8 group-hover:rotate-6 transition-transform ${color === 'cyan' ? 'bg-cyan-50 text-[#00E5FF]' : 'bg-slate-50 text-slate-400'}`}>
      {icon}
    </div>
    <span className="text-slate-400 font-black text-xs uppercase tracking-widest mb-2">{label}</span>
    <span className="text-4xl font-black tracking-tighter text-slate-900">{normalizedValue}</span>
  </div>
  );
};

const ProductsTabLegacy: React.FC<{products: Product[], onAdd: () => void, onMakeOffer: (p: Product) => void, onDelete: (id: string) => void}> = ({products, onAdd, onMakeOffer, onDelete}) => (
  <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-12 flex-row-reverse">
      <h3 className="text-3xl font-black">المخزون</h3>
      <button onClick={onAdd} className="px-8 py-4 bg-[#00E5FF] text-white rounded-2xl font-black text-sm hover:bg-[#00D4FF] transition-all flex items-center gap-3">
        <Plus size={20} /> إضافة صنف
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {products.length === 0 ? (
        <div className="col-span-full py-20 text-center">
          <Package size={64} className="mx-auto mb-6 opacity-10" />
          <p className="text-slate-300 font-black text-xl">لا توجد أصناف حالياً</p>
        </div>
      ) : (
        products.map(product => (
          <div key={product.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:shadow-xl transition-all group">
            <img src={product.imageUrl} className="w-full h-48 object-cover rounded-2xl mb-4 group-hover:scale-105 transition-transform" />
            <h4 className="font-black text-lg text-slate-900 mb-2">{product.name}</h4>
            <p className="text-2xl font-black text-[#00E5FF] mb-4">ج.م {product.price}</p>
            <div className="flex gap-2">
              <button onClick={() => onMakeOffer(product)} className="flex-1 py-3 bg-purple-500 text-white rounded-xl font-black text-xs hover:bg-purple-600">عرض</button>
              <button onClick={() => onDelete(product.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

const PromotionsTab: React.FC<{offers: Offer[], onDelete: (id: string) => void, onCreate: () => void}> = ({offers, onDelete, onCreate}) => (
  <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
    <div className="flex items-center justify-between mb-10 flex-row-reverse">
       <h3 className="text-3xl font-black">مركز الترويج الفعال</h3>
       <div className="flex items-center gap-3 flex-row-reverse">
         <button onClick={onCreate} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-black transition-all">
           <Tag size={16} /> إنشاء عرض جديد
         </button>
         <span className="bg-purple-100 text-[#BD00FF] px-6 py-2 rounded-full font-black text-xs uppercase">{offers.length} عروض نشطة</span>
       </div>
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

const GrowthTabLegacy: React.FC<{shop: any, analytics: any, products: Product[]}> = ({shop, analytics, products}) => {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const generateGrowth = async () => {
    setLoading(true); setInsight('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `أنا مساعد أعمال "تست". محل "${shop.name}" لديه إيرادات ج.م ${analytics.totalRevenue}. عدد المنتجات ${products.length}.
      حلل الأداء بلهجة مصرية روشة وقدم: 1) نصيحة نمو واحدة. 2) نص تسويقي جذاب لأهم منتج.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 5000 } }
      });
      setInsight(response.text || '');
    } catch (e) {
      addToast('فشل توليد الأفكار، حاول مرة أخرى', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-16 rounded-[3.5rem] text-white">
          <div className="absolute top-0 left-0 p-20 opacity-10 pointer-events-none group"><Zap size={300} className="text-[#00E5FF] animate-pulse" /></div>
          <Sparkles className="w-20 h-20 text-[#00E5FF] mb-10" />
          <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9]">مستقبلك يبدأ <br/><span className="text-[#00E5FF]">بالشعاع الذكي.</span></h2>
          <p className="text-slate-400 font-bold mb-12 max-w-lg text-xl leading-relaxed">استخدم قوة Gemini لتحليل أداء متجرك وكتابة نصوص تسويقية ذكية لوسائل التواصل الاجتماعي في ثوانٍ.</p>
          <button onClick={generateGrowth} disabled={loading} className="px-16 py-7 bg-white text-black rounded-3xl font-black text-2xl hover:bg-[#00E5FF] transition-all flex items-center justify-center gap-5 shadow-[0_0_60px_rgba(255,255,255,0.15)] relative z-10">
            {loading ? <Loader2 className="animate-spin" size={28} /> : <Wand2 className="text-[#BD00FF]" size={28} />}
            {loading ? 'جاري التحليل واستخراج الأفكار...' : 'توليد أفكار النمو والتسويق'}
          </button>
          {insight && (
            <div className="mt-12 p-8 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
              <h3 className="text-2xl font-black mb-6 text-[#00E5FF]">💡 الأفكار المقترحة</h3>
              <div className="text-lg leading-relaxed whitespace-pre-line">{insight}</div>
            </div>
          )}
    </div>
  );
};

const SettingsTabLegacy: React.FC<{ shop: any, onSaved: () => void, adminShopId?: string }> = ({ shop, onSaved, adminShopId }) => {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSave = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast('تم حفظ الإعدادات بنجاح', 'success');
      onSaved();
    } catch (e) {
      addToast('فشل حفظ الإعدادات', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
      <h3 className="text-3xl font-black mb-10">إعدادات المتجر</h3>
      <div className="space-y-8">
        <div>
          <label className="block text-slate-700 font-black mb-3">اسم المتجر</label>
          <input type="text" defaultValue={shop.name} className="w-full p-4 border border-slate-200 rounded-2xl font-bold" />
        </div>
        <div>
          <label className="block text-slate-700 font-black mb-3">رقم الهاتف</label>
          <input type="tel" defaultValue={shop.phone} className="w-full p-4 border border-slate-200 rounded-2xl font-bold" />
        </div>
        <div>
          <label className="block text-slate-700 font-black mb-3">العنوان</label>
          <textarea defaultValue={shop.addressDetailed} rows={4} className="w-full p-4 border border-slate-200 rounded-2xl font-bold" />
        </div>
        <button onClick={handleSave} disabled={loading} className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-xl hover:bg-black transition-all">
          {loading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
};

// Mock modals for now
const AddProductModalLegacy: React.FC<{ isOpen: boolean, onClose: () => void, shopId: string }> = ({ isOpen, onClose, shopId }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full">
        <h3 className="text-2xl font-black mb-6">إضافة منتج جديد</h3>
        <p className="text-slate-600 mb-6">هذه الميزة قيد التطوير</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black">إغلاق</button>
      </div>
    </div>
  );
};

const CreateOfferModalLegacy: React.FC<{ product: Product | null, onClose: () => void, shopId: string }> = ({ product, onClose }) => {
  if (!product) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full">
        <h3 className="text-2xl font-black mb-6">إنشاء عرض لـ {product.name}</h3>
        <p className="text-slate-600 mb-6">هذه الميزة قيد التطوير</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black">إغلاق</button>
      </div>
    </div>
  );
};

const TabButtonLegacy: any = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-10 py-5 rounded-full font-black text-xs transition-all whitespace-nowrap ${active ? 'bg-slate-900 text-white shadow-[0_15px_30px_rgba(0,0,0,0.15)]' : 'text-slate-400 hover:text-slate-900 hover:bg-white'}`}>
    {icon} <span>{label}</span>
  </button>
);

const StatCardLegacy: any = ({ label, value, icon, color }: any) => {
  const normalizedValue = (() => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'number' && Number.isNaN(value)) return 0;
    if (typeof value === 'string') return value.replace(/\b(undefined|null)\b/g, '0');
    return value;
  })();

  return (
  <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm text-right flex flex-col items-end group hover:shadow-xl transition-all">
    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-2xl mb-8 group-hover:rotate-6 transition-transform ${color === 'cyan' ? 'bg-cyan-50 text-[#00E5FF]' : 'bg-slate-50 text-slate-400'}`}>
      {icon}
    </div>
    <span className="text-slate-400 font-black text-xs uppercase tracking-widest mb-2">{label}</span>
    <span className="text-4xl font-black tracking-tighter text-slate-900">{normalizedValue}</span>
  </div>
  );
};

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
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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

const OverviewTab: React.FC<{shop: any, analytics: any, notifications: any[]}> = ({shop, analytics, notifications}) => {
  const safeAnalytics = analytics || {};
  const salesCountToday = safeAnalytics.salesCountToday ?? 0;
  const revenueToday = safeAnalytics.revenueToday ?? 0;
  const chartData = Array.isArray(safeAnalytics.chartData) ? safeAnalytics.chartData : [];

  return (
  <div className="space-y-12">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
      <StatCard label="المتابعين" value={shop.followers?.toLocaleString() || '0'} icon={<Users size={32} />} color="cyan" />
      <StatCard label="زيارات المتجر" value={shop.visitors?.toLocaleString() || '0'} icon={<Eye size={32} />} color="cyan" />
      <StatCard label="مبيعات اليوم" value={`${salesCountToday}`} icon={<ShoppingCart size={32} />} color="slate" />
      <StatCard label="إيرادات اليوم" value={`ج.م ${revenueToday}`} icon={<DollarSign size={32} />} color="cyan" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
       <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-12 flex-row-reverse">
             <h3 className="text-3xl font-black text-slate-900">رادار المبيعات</h3>
             <div className="flex items-center gap-2 text-green-500 font-black text-sm px-4 py-1 bg-green-50 rounded-full"><TrendingUp size={16} /> نمو مستمر</div>
          </div>
          <div className="h-[450px] w-full min-w-[300px] min-h-[400px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={400}>
              <AreaChart data={chartData}>
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
};

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

const SettingsTab: React.FC<{shop: any, onSaved: () => void, adminShopId?: string}> = ({shop, onSaved, adminShopId}) => {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(shop?.name || '');
  const [governorate, setGovernorate] = useState(shop?.governorate || '');
  const [city, setCity] = useState(shop?.city || '');
  const [category, setCategory] = useState(shop?.category || 'RETAIL');
  const [phone, setPhone] = useState(shop?.phone || '');
  const [email, setEmail] = useState(shop?.email || '');
  const [whatsapp, setWhatsapp] = useState(shop?.layoutConfig?.whatsapp || '');
  const [customDomain, setCustomDomain] = useState(shop?.layoutConfig?.customDomain || '');
  const [logoUrl, setLogoUrl] = useState(shop?.logoUrl || shop?.logo_url || '');
  const [bannerUrl, setBannerUrl] = useState(shop?.bannerUrl || shop?.banner_url || '');
  const [openingHours, setOpeningHours] = useState(shop?.openingHours || shop?.opening_hours || '');
  const [addressDetailed, setAddressDetailed] = useState(shop?.addressDetailed || shop?.address_detailed || '');
  const [description, setDescription] = useState(shop?.description || '');

  const handlePickImage = (kind: 'logo' | 'banner') => {
    if (kind === 'logo') {
      logoInputRef.current?.click();
      return;
    }
    bannerInputRef.current?.click();
  };

  const handleImageChange = (kind: 'logo' | 'banner', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast('الصورة كبيرة جداً، يرجى اختيار صورة أقل من 2 ميجابايت', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (kind === 'logo') setLogoUrl(dataUrl);
      else setBannerUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await ApiService.updateMyShop({
        ...(adminShopId ? { shopId: adminShopId } : {}),
        name,
        governorate,
        city,
        category,
        phone,
        email,
        whatsapp,
        customDomain,
        logoUrl,
        bannerUrl,
        openingHours,
        addressDetailed,
        description,
      });
      addToast('تم حفظ إعدادات المتجر', 'success');
      onSaved();
    } catch (e) {
      const message = (e as any)?.message ? String((e as any).message) : '';
      addToast(message ? `فشل حفظ الإعدادات: ${message}` : 'فشل حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-12 md:p-16 rounded-[3.5rem] border border-slate-100 shadow-sm">
       <h3 className="text-3xl font-black mb-12">إعدادات المتجر العامة</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">الاسم التجاري الرسمي</label>
             <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none focus:ring-2 focus:ring-[#00E5FF]/20 focus:bg-white transition-all" />
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">المحافظة</label>
             <input value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none focus:ring-2 focus:ring-[#00E5FF]/20 focus:bg-white transition-all" />
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">المدينة</label>
             <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none focus:ring-2 focus:ring-[#00E5FF]/20 focus:bg-white transition-all" />
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">نوع المتجر</label>
             <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none appearance-none">
                <option value="RETAIL">محل تجاري</option>
                <option value="RESTAURANT">مطعم / كافيه</option>
                <option value="SERVICE">خدمات</option>
             </select>
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">رقم الهاتف</label>
             <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none" />
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">البريد الإلكتروني</label>
             <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none" />
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">رقم الواتساب للتواصل</label>
             <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none" placeholder="01x xxxx xxxx" />
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">الدومين المخصص (اختياري)</label>
             <input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none" placeholder="example.com" />
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">لوجو المتجر</label>
             <div className="flex gap-4 items-center flex-row-reverse">
                <div
                  onClick={() => handlePickImage('logo')}
                  className="w-28 h-28 rounded-[2rem] overflow-hidden bg-slate-50 border border-slate-100 shrink-0 cursor-pointer"
                >
                  <img
                    src={logoUrl || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200'}
                    className="w-full h-full object-cover"
                    alt="logo"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => handlePickImage('logo')}
                    className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm hover:bg-black transition-all"
                  >
                    اختيار صورة من الجهاز
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="w-full py-4 bg-slate-50 text-slate-500 rounded-[1.5rem] font-black text-sm hover:bg-slate-100 transition-all"
                  >
                    حذف الصورة
                  </button>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleImageChange('logo', e)}
                />
             </div>
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">بانر المتجر</label>
             <div
               onClick={() => handlePickImage('banner')}
               className="relative aspect-video rounded-[2rem] overflow-hidden bg-slate-50 border border-slate-100 cursor-pointer"
             >
               <img
                 src={bannerUrl || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200'}
                 className="w-full h-full object-cover"
                 alt="banner"
               />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handlePickImage('banner')}
                  className="py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm hover:bg-black transition-all"
                >
                  اختيار بانر من الجهاز
                </button>
                <button
                  type="button"
                  onClick={() => setBannerUrl('')}
                  className="py-4 bg-slate-50 text-slate-500 rounded-[1.5rem] font-black text-sm hover:bg-slate-100 transition-all"
                >
                  حذف البانر
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleImageChange('banner', e)}
                />
             </div>
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">ساعات العمل</label>
             <input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none" />
          </div>
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">العنوان التفصيلي</label>
             <input value={addressDetailed} onChange={(e) => setAddressDetailed(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none" />
          </div>
          <div className="space-y-3 md:col-span-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-6">وصف المتجر</label>
             <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] py-6 px-10 font-black text-lg text-right outline-none min-h-[140px]" />
          </div>
       </div>
       <div className="mt-12 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="px-16 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-black transition-all shadow-2xl disabled:bg-slate-300">{saving ? 'جاري الحفظ...' : 'حفظ كافة التغييرات السيادية'}</button>
       </div>
    </div>
  );
};

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
