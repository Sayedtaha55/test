
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, ShoppingBag, Heart, MapPin, Bell, LogOut, ChevronLeft, Star, CalendarCheck, Clock, CheckCircle2, AlertCircle, Zap, ArrowLeft, Store, UtensilsCrossed, Sparkles } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import { RayDB } from '@/constants';
import { Reservation, Product } from '@/types';

const { Link, useNavigate } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

type ProfileTab = 'reservations' | 'favorites' | 'notifications' | 'settings';

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('reservations');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('ray_user');
    if (!savedUser) navigate('/login');
    else setUser(JSON.parse(savedUser));

    // Fix: Await asynchronous RayDB calls
    const loadData = async () => {
      setReservations(await RayDB.getReservations());
      const favIds = RayDB.getFavorites();
      const allProducts = await RayDB.getProducts();
      
      // Debug: Log to check what's happening
      console.log('Favorite IDs:', favIds);
      console.log('All Products:', allProducts.map(p => ({ id: p.id, name: p.name })));
      
      // Better matching logic - ensure both IDs are strings
      const filteredProducts = allProducts.filter(p => {
        const productId = String(p.id);
        const isFavorite = favIds.some(favId => String(favId) === productId);
        return isFavorite;
      });
      
      console.log('Filtered favorites:', filteredProducts);
      setFavorites(filteredProducts);
    };
    loadData();
    window.addEventListener('ray-db-update', loadData);
    return () => window.removeEventListener('ray-db-update', loadData);
  }, [navigate]);

  const logout = () => {
    // مسح كافة بيانات الجلسة
    localStorage.removeItem('ray_user');
    localStorage.removeItem('ray_token');
    localStorage.removeItem('ray_session');
    
    // إخطار التطبيق وتوجيه المستخدم
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-10 md:py-20 text-right" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16">
        
        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white border border-slate-100 p-8 md:p-12 rounded-[3rem] shadow-sm flex flex-col items-center text-center">
             <div className="w-24 h-24 md:w-32 md:h-32 bg-[#00E5FF] rounded-full flex items-center justify-center text-black font-black text-4xl md:text-5xl mb-6 shadow-2xl ring-8 ring-cyan-50">
               {user.name.charAt(0)}
             </div>
             <h2 className="text-3xl font-black mb-2">{user.name}</h2>
             <p className="text-slate-400 font-bold mb-8">{user.email}</p>
             <div className="flex gap-2 w-full">
               <button className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm">تعديل الملف</button>
               <button onClick={logout} className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><LogOut size={20} /></button>
             </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-8 space-y-10">
          
          <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar pb-2">
             <TabBtn active={activeTab === 'reservations'} onClick={() => setActiveTab('reservations')} icon={<CalendarCheck size={18} />} label="حجوزاتي" />
             <TabBtn active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} icon={<Heart size={18} />} label="المفضلة" />
             <TabBtn active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell size={18} />} label="التنبيهات" />
             <TabBtn active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label="الإعدادات" />
          </div>

          <AnimatePresence mode="wait">
            <MotionDiv 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            >
              {activeTab === 'reservations' && (
                <div className="space-y-6">
                  {reservations.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 md:p-20 rounded-[3.5rem] text-center flex flex-col items-center">
                       <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl text-slate-200">
                          <CalendarCheck size={48} />
                       </div>
                       <h3 className="text-3xl font-black mb-4">مستعد لأول حجز؟</h3>
                       <p className="text-slate-400 font-bold text-lg mb-10 max-w-sm leading-relaxed">
                          احجز عروضك المفضلة الآن واستلمها من المحل بكل سهولة خلال ٢٤ ساعة.
                       </p>
                       <Link to="/" className="px-12 py-5 bg-[#00E5FF] text-slate-900 rounded-[2rem] font-black text-lg flex items-center gap-3 hover:scale-105 transition-all shadow-xl shadow-cyan-100">
                          <Sparkles size={20} /> اكتشف العروض
                       </Link>
                    </div>
                  ) : (
                    reservations.map(res => (
                      <div key={res.id} className="bg-white border border-slate-100 p-6 md:p-8 rounded-[2.5rem] flex items-center justify-between gap-6 group">
                         <div className="flex items-center gap-6 flex-row-reverse">
                            <img src={res.itemImage} className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                            <div className="text-right">
                               <p className="font-black text-xl">{res.itemName}</p>
                               <p className="text-slate-400 font-bold text-sm">متجر {res.shopName}</p>
                            </div>
                         </div>
                         <div className="text-left">
                            <p className="text-2xl font-black">ج.م {res.itemPrice}</p>
                            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase">بانتظار الاستلام</span>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   {favorites.length === 0 ? (
                     <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 p-12 md:p-20 rounded-[3.5rem] text-center flex flex-col items-center">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl text-red-100">
                           <Heart size={48} fill="currentColor" />
                        </div>
                        <h3 className="text-3xl font-black mb-4">فين الحب؟</h3>
                        <p className="text-slate-400 font-bold text-lg mb-10 max-w-sm leading-relaxed">
                           لسة مفيش منتجات في المفضلة. ضيف الحاجات اللي عجبتك عشان تلاقيها هنا بسرعة.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                          <Link to="/shops" className="px-8 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-black transition-all">
                             <Store size={18} /> تسوق المحلات
                          </Link>
                          <Link to="/restaurants" className="px-8 py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
                             <UtensilsCrossed size={18} /> اكتشف المطاعم
                          </Link>
                        </div>
                     </div>
                   ) : (
                     favorites.map(product => (
                      <div key={product.id} className="bg-white border border-slate-100 p-6 rounded-[2.5rem] flex items-center gap-6 group hover:shadow-xl transition-all">
                         <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0">
                            <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                         </div>
                         <div className="flex-1 text-right">
                            <h4 className="font-black mb-1">{product.name}</h4>
                            <p className="text-[#00E5FF] font-black text-xl">ج.م {product.price}</p>
                         </div>
                         <button onClick={() => RayDB.toggleFavorite(product.id)} className="text-red-500"><Heart size={20} fill="currentColor" /></button>
                      </div>
                    ))
                   )}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  {[
                    { title: 'أهلاً بك في تست!', desc: 'استمتع بأفضل العروض الحصرية في مصر.', type: 'promo' }
                  ].map((notif, i) => (
                    <div key={i} className="p-8 rounded-[2rem] border-r-8 bg-cyan-50 border-cyan-400 flex items-center gap-6 flex-row-reverse text-right">
                       <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center"><Zap size={20} /></div>
                       <div className="flex-1">
                          <p className="font-black text-lg">{notif.title}</p>
                          <p className="text-slate-500 font-bold text-sm">{notif.desc}</p>
                       </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="bg-white border border-slate-100 p-8 rounded-[3rem] space-y-8 text-right">
                   <h3 className="text-2xl font-black mb-12">إعدادات الحساب</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-4">رقم الموبايل</label>
                         <input className="w-full bg-slate-50 rounded-2xl py-4 px-6 font-bold text-right outline-none focus:bg-white focus:ring-2 focus:ring-[#00E5FF]/20" defaultValue="0123456789" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-4">المنطقة</label>
                         <input className="w-full bg-slate-50 rounded-2xl py-4 px-6 font-bold text-right outline-none focus:bg-white focus:ring-2 focus:ring-[#00E5FF]/20" defaultValue="القاهرة" />
                      </div>
                   </div>
                   <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl">حفظ التعديلات</button>
                </div>
              )}
            </MotionDiv>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const TabBtn: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${active ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900 hover:bg-white border border-slate-100'}`}>
    {icon} <span>{label}</span>
  </button>
);

export default ProfilePage;
