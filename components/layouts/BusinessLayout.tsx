
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { LayoutDashboard, Store, CreditCard, BarChart3, Settings, Bell, Zap, LogOut, ChevronRight, HelpCircle, Menu, X, Clock, CheckCircle2, UserPlus, ShoppingBag, Calendar, Camera, Users, Megaphone, MessageCircle, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiService } from '@/services/api.service';
import { useToast } from '@/components';

const { Link, Outlet, useLocation, useNavigate } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

const BusinessLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname.includes('/dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { addToast } = useToast();

  const userStr = localStorage.getItem('ray_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const impersonateShopId = new URLSearchParams(location.search).get('impersonateShopId');
  const activeTab = new URLSearchParams(location.search).get('tab') || 'overview';
  const effectiveUser = (user?.role === 'admin' && impersonateShopId)
    ? { ...user, role: 'merchant', shopId: impersonateShopId, name: `Admin (${impersonateShopId})` }
    : user;

  const buildDashboardUrl = (tab?: string) => {
    const params = new URLSearchParams(location.search);
    if (!tab || tab === 'overview') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const qs = params.toString();
    return `/business/dashboard${qs ? `?${qs}` : ''}`;
  };

  const loadNotifications = async () => {
    if (!effectiveUser?.shopId) return;
    try {
      const data = await ApiService.getNotifications(effectiveUser.shopId);
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    } catch (e) {
      // Failed to load notifications - handled silently
    }
  };

  useEffect(() => {
    if (isDashboard && effectiveUser?.shopId) {
      loadNotifications();
      
      // الاشتراك في قناة الإشعارات الحية
      const subscription = ApiService.subscribeToNotifications(effectiveUser.shopId, (notif) => {
        // تشغيل صوت تنبيه
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
        
        // إظهار توست للمستخدم
        addToast(notif.title, 'info');
        
        // تحديث القائمة فوراً
        setNotifications(prev => [notif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isDashboard, effectiveUser?.shopId]);

  const handleMarkRead = async () => {
    if (!effectiveUser?.shopId) return;
    await ApiService.markNotificationsRead(effectiveUser.shopId);
    setUnreadCount(0);
  };

  const handleLogout = () => {
    if (impersonateShopId && user?.role === 'admin') {
      window.close();
      navigate('/admin/dashboard');
      return;
    }
    localStorage.removeItem('ray_user');
    localStorage.removeItem('ray_token');
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  if (!isDashboard) {
    return (
      <div className="min-h-screen bg-slate-900 text-white selection:bg-[#00E5FF] selection:text-slate-900 text-right font-sans" dir="rtl">
        <header className="max-w-[1400px] mx-auto px-4 md:px-6 h-24 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
             <div className="w-8 h-8 md:w-10 md:h-10 bg-[#00E5FF] flex items-center justify-center rounded-xl shadow-lg shadow-cyan-500/20">
                <span className="text-slate-900 font-black text-xl md:text-2xl leading-none">T</span>
              </div>
            <span className="text-xl md:text-2xl font-black tracking-tighter uppercase">تست للأعمال</span>
          </Link>
          <div className="flex items-center gap-4 md:gap-8">
            <Link to="/login" className="text-xs md:text-sm font-bold hover:text-[#00E5FF] transition-colors">دخول التجار</Link>
            <Link to="/signup" className="bg-white text-slate-900 px-5 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-[#00E5FF] transition-all shadow-xl">ابدأ مجاناً</Link>
          </div>
        </header>
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row-reverse text-right font-sans" dir="rtl">
      {/* Mobile Header */}
      <header className="md:hidden h-20 bg-slate-900 text-white flex items-center justify-between px-6 sticky top-0 z-[60]">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00E5FF] flex items-center justify-center rounded-lg">
            <span className="text-slate-900 font-black text-lg">T</span>
          </div>
          <span className="font-black tracking-tighter uppercase">test Biz</span>
        </Link>
        <div className="flex items-center gap-4">
           <button
             onClick={() => navigate(buildDashboardUrl('builder'))}
             aria-label="هوية المتجر"
             title="هوية المتجر"
             className="p-2 bg-white/10 rounded-lg"
           >
             <Palette className="w-6 h-6" />
           </button>
           <div className="relative" onClick={() => { setNotifOpen(true); handleMarkRead(); }}>
              <motion.div animate={unreadCount > 0 ? { scale: [1, 1.2, 1] } : {}} transition={{ repeat: Infinity, duration: 1.5 }}>
                <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-[#00E5FF]' : 'text-white'}`} />
              </motion.div>
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-900 text-[8px] flex items-center justify-center font-black text-white">{unreadCount}</span>}
           </div>
           <button onClick={() => setSidebarOpen(true)} className="p-2 bg-white/10 rounded-lg">
             <Menu className="w-6 h-6" />
           </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <MotionDiv 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`w-80 bg-slate-900 text-white flex flex-col fixed inset-y-0 right-0 z-[110] shadow-2xl transition-transform duration-500 ease-in-out overflow-hidden min-h-0 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00E5FF] flex items-center justify-center rounded-xl">
              <span className="text-slate-900 font-black text-xl">T</span>
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase">test Biz.</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-6 space-y-2 py-4 overflow-y-auto no-scrollbar min-h-0">
          <NavItem to={buildDashboardUrl('overview')} onClick={() => setSidebarOpen(false)} icon={<LayoutDashboard size={20} />} label="لوحة التحكم" active={activeTab === 'overview'} />
          <NavItem to={buildDashboardUrl('pos')} onClick={() => setSidebarOpen(false)} icon={<Store size={20} />} label="نظام الكاشير" active={activeTab === 'pos'} />
          <NavItem to={buildDashboardUrl('gallery')} onClick={() => setSidebarOpen(false)} icon={<Camera size={20} />} label="معرض الصور" active={activeTab === 'gallery'} />
          <NavItem to={buildDashboardUrl('reports')} onClick={() => setSidebarOpen(false)} icon={<BarChart3 size={20} />} label="التقارير" active={activeTab === 'reports'} />
          <NavItem to={buildDashboardUrl('customers')} onClick={() => setSidebarOpen(false)} icon={<Users size={20} />} label="العملاء" active={activeTab === 'customers'} />
          <NavItem to={buildDashboardUrl('products')} onClick={() => setSidebarOpen(false)} icon={<ShoppingBag size={20} />} label="المخزون" active={activeTab === 'products'} />
          <NavItem to={buildDashboardUrl('promotions')} onClick={() => setSidebarOpen(false)} icon={<Megaphone size={20} />} label="العروض" active={activeTab === 'promotions'} />
          <NavItem to={buildDashboardUrl('reservations')} onClick={() => setSidebarOpen(false)} icon={<Calendar size={20} />} label="الحجوزات" active={activeTab === 'reservations'} />
          <NavItem to={buildDashboardUrl('chats')} onClick={() => setSidebarOpen(false)} icon={<MessageCircle size={20} />} label="المحادثات" active={activeTab === 'chats'} />
          <NavItem to={buildDashboardUrl('sales')} onClick={() => setSidebarOpen(false)} icon={<CreditCard size={20} />} label="سجل المبيعات" active={activeTab === 'sales'} />
          <NavItem to={buildDashboardUrl('growth')} onClick={() => setSidebarOpen(false)} icon={<Zap size={20} />} label="مركز النمو AI" active={activeTab === 'growth'} />
          <NavItem to={buildDashboardUrl('settings')} onClick={() => setSidebarOpen(false)} icon={<Settings size={20} />} label="الإعدادات" active={activeTab === 'settings'} />
        </nav>

        <div className="p-6 mt-auto border-t border-white/5 space-y-2">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-bold group"
           >
             <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
             <span>تسجيل الخروج</span>
           </button>
        </div>
      </aside>

      <AnimatePresence>
        {isNotifOpen && (
          <>
            <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setNotifOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]" />
            <MotionDiv initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed top-0 right-0 h-full w-full max-w-sm bg-white z-[160] shadow-2xl flex flex-col p-8 text-right">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-2xl font-black">التنبيهات</h3>
                   <button onClick={() => setNotifOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                   {notifications.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                        <Bell size={48} className="opacity-10" />
                        <p className="font-bold">لا توجد تنبيهات جديدة</p>
                     </div>
                   ) : (
                     notifications.map((n: any) => (
                       <div key={n.id} className={`p-4 rounded-2xl border flex items-start gap-4 flex-row-reverse ${n.is_read ? 'bg-white border-slate-100' : 'bg-cyan-50 border-cyan-100 ring-1 ring-cyan-200'}`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            n.type === 'sale' ? 'bg-green-100 text-green-600' : 
                            n.type === 'reservation' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                             {n.type === 'sale' ? <ShoppingBag size={18} /> : n.type === 'reservation' ? <Calendar size={18} /> : <UserPlus size={18} />}
                          </div>
                          <div className="flex-1 text-right">
                             <p className="font-black text-sm text-slate-900 leading-tight mb-1">{n.title}</p>
                             <p className="text-xs text-slate-500 font-bold mb-2">{n.message}</p>
                             <span className="text-[9px] text-slate-400 font-black flex items-center gap-1 justify-end"><Clock size={10} /> {new Date(n.created_at).toLocaleTimeString('ar-EG')}</span>
                          </div>
                       </div>
                     ))
                   )}
                </div>
                <button onClick={() => setNotifOpen(false)} className="mt-6 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm">إغلاق القائمة</button>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 md:mr-80 overflow-x-hidden">
        <header className="hidden md:flex h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 items-center justify-between px-12 sticky top-0 z-40">
          <div className="flex flex-col text-right">
             <h2 className="font-black text-slate-900 text-xl leading-none">لوحة التحكم الذكية</h2>
             <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">مركز العمليات - {effectiveUser?.name}</p>
          </div>
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate(buildDashboardUrl('builder'))}
              aria-label="هوية المتجر"
              title="هوية المتجر"
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-900 transition-all"
            >
              <Palette className="w-5 h-5" />
            </button>
            <div className="relative cursor-pointer group" onClick={() => { setNotifOpen(true); handleMarkRead(); }}>
               <motion.div animate={unreadCount > 0 ? { scale: [1, 1.1, 1] } : {}} transition={{ repeat: Infinity, duration: 2 }}>
                 <Bell className={`w-6 h-6 transition-colors ${unreadCount > 0 ? 'text-[#00E5FF]' : 'text-slate-300 group-hover:text-slate-900'}`} />
               </motion.div>
               {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-4 border-white text-[8px] flex items-center justify-center font-black text-white">{unreadCount}</span>}
            </div>
            <div className="flex items-center gap-4 pl-4 border-l border-slate-100">
               <div className="text-left">
                 <p className="font-black text-sm text-slate-900 leading-none">{user?.name}</p>
                 <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">صاحب العمل</p>
               </div>
               <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center font-black text-[#00E5FF] shadow-lg shadow-cyan-500/10">
                 {effectiveUser?.name?.charAt(0)}
               </div>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-12 min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }> = ({ to, icon, label, active, onClick }) => (
  <Link to={to} onClick={onClick} className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${
    active ? 'bg-[#00E5FF] text-slate-900 font-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 font-bold'
  }`}>
    <div className={`${active ? 'text-slate-900' : 'group-hover:text-[#00E5FF]'}`}>{icon}</div>
    <span className="flex-1 text-sm">{label}</span>
    {active && <ChevronRight className="w-4 h-4 rotate-180" />}
  </Link>
);

export default BusinessLayout;
