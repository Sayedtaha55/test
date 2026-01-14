
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Search, User, Sparkles, Bell, Heart, ShoppingCart, Menu, X, LogOut, Info, PlusCircle } from 'lucide-react';
import { RayAssistant, CartDrawer } from '@/components';
import { motion, AnimatePresence } from 'framer-motion';

const { Link, Outlet, useLocation, useNavigate } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

const PublicLayout: React.FC = () => {
  const [isAssistantOpen, setAssistantOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    const checkAuth = () => {
      const savedUser = localStorage.getItem('ray_user');
      if (savedUser) setUser(JSON.parse(savedUser));
      else setUser(null);
    };
    checkAuth();
    const handleAddToCart = (e: any) => {
      setCartItems(prev => [...prev, e.detail]);
      setCartOpen(true);
    };
    window.addEventListener('add-to-cart', handleAddToCart);
    window.addEventListener('auth-change', checkAuth);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('add-to-cart', handleAddToCart);
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem('ray_user');
    localStorage.removeItem('ray_token');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    navigate('/');
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1A1A1A] selection:bg-[#00E5FF] selection:text-black font-sans">
      <nav 
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ease-in-out px-4 md:px-8 ${
          scrolled ? 'py-2 md:py-4' : 'py-4 md:py-8'
        }`}
      >
        <div 
          className={`max-w-[1400px] mx-auto h-16 md:h-20 rounded-[1.2rem] md:rounded-[2.5rem] transition-all duration-700 flex items-center justify-between px-3 md:px-10 ${
            scrolled 
              ? 'glass shadow-[0_20px_50px_rgba(0,0,0,0.06)] border-white/50' 
              : 'bg-white/60 border-transparent'
          }`}
        >
          <Link to="/" className="flex items-center gap-3 md:gap-5 group shrink-0">
            <MotionDiv 
              whileHover={{ scale: 1.1, rotate: -2 }}
              className="w-10 h-10 md:w-16 md:h-16 bg-[#00E5FF] flex items-center justify-center rounded-xl md:rounded-[1.5rem] shadow-[0_15px_35px_rgba(0,229,255,0.3)] transition-all duration-500"
            >
              <span className="text-[#1A1A1A] font-black text-xl md:text-4xl tracking-tighter">T</span>
            </MotionDiv>
            <span className="text-xl md:text-3xl font-black tracking-tighter uppercase hidden sm:block">test.</span>
          </Link>

          <div className="hidden lg:flex flex-1 items-center gap-6 max-w-2xl mx-8">
            <div onClick={() => setAssistantOpen(true)} className="flex-1 group">
              <div className="relative flex items-center bg-slate-100/60 hover:bg-white rounded-[1.5rem] px-6 py-3 border border-transparent hover:border-[#00E5FF]/30 cursor-pointer transition-all duration-500">
                <Sparkles className="w-4 h-4 text-[#00E5FF] ml-3" />
                <span className="text-slate-400 text-xs font-semibold truncate mr-2">ابحث عن أقوى العروض الآن...</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-4">
            <button 
              onClick={() => setCartOpen(true)}
              className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 group transition-all"
            >
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-slate-500 group-hover:text-black" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-[#BD00FF] text-white text-[8px] md:text-[10px] font-black rounded-full flex items-center justify-center ring-2 md:ring-4 ring-white">
                  {cartItems.length}
                </span>
              )}
            </button>
            <div className="h-6 md:h-8 w-[1px] bg-slate-100 mx-1 md:mx-2 hidden sm:block" />
            {user ? (
              <Link to={user.role === 'merchant' ? '/business/dashboard' : '/profile'} className="flex items-center gap-2 md:gap-3 bg-slate-900 text-white pl-3 pr-1 py-1 rounded-full hover:bg-black transition-all">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#00E5FF] text-black font-black flex items-center justify-center text-[10px] md:text-xs">
                  {user.name?.charAt(0) || 'U'}
                </div>
                <span className="text-[10px] md:text-xs font-black hidden md:block">{user.role === 'merchant' ? 'لوحة التحكم' : user.name}</span>
              </Link>
            ) : (
              <Link to="/login" className="bg-[#1A1A1A] text-white px-4 md:px-8 py-2 md:py-3.5 rounded-lg md:rounded-2xl font-black text-[10px] md:text-sm hover:bg-[#00E5FF] hover:text-black transition-all">
                دخول
              </Link>
            )}

            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-900"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-[85%] max-w-sm bg-white z-[120] p-8 flex flex-col shadow-2xl" dir="rtl" >
              <div className="flex justify-between items-center mb-12">
                <span className="text-2xl font-black tracking-tighter uppercase">test.</span>
                <button onClick={() => setMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <nav className="flex flex-col gap-6 flex-1">
                <MobileNavItem to="/shops" onClick={() => setMobileMenuOpen(false)} icon={<ShoppingCart className="text-[#00E5FF]" />} label="المحلات" />
                <MobileNavItem to="/restaurants" onClick={() => setMobileMenuOpen(false)} icon={<ShoppingCart className="text-[#BD00FF]" />} label="المطاعم" />
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="pt-20 md:pt-32 min-h-screen">
        <Outlet />
      </main>

      <RayAssistant isOpen={isAssistantOpen} onClose={() => setAssistantOpen(false)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setCartOpen(false)} items={cartItems} onRemove={removeFromCart} />

      <footer className="bg-[#1A1A1A] text-white pt-16 md:pt-32 pb-12 mt-16 md:mt-32 rounded-t-[2rem] md:rounded-t-[4rem]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-20 text-right">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6 flex-row-reverse md:justify-end">
              <div className="w-8 h-8 bg-[#00E5FF] flex items-center justify-center rounded-lg"><span className="text-black font-black text-lg">T</span></div>
              <span className="text-2xl font-black tracking-tighter uppercase">test.</span>
            </div>
            <p className="text-slate-400 max-w-sm text-base md:text-xl font-medium">نحن في مرحلة التجربة. شكراً لثقتكم بنا في بناء مستقبل التسوق في مصر.</p>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div>
              <h4 className="font-black text-[10px] uppercase tracking-widest text-[#00E5FF] mb-6">استكشف</h4>
              <nav className="flex flex-col gap-4 text-slate-300 font-bold text-sm md:text-lg">
                <Link to="/about" className="hover:text-white transition-colors">من نحن</Link>
                <Link to="/shops" className="hover:text-white transition-colors">المحلات</Link>
                <Link to="/restaurants" className="hover:text-white transition-colors">المطاعم</Link>
              </nav>
            </div>
            <div>
              <h4 className="font-black text-[10px] uppercase tracking-widest text-[#BD00FF] mb-6">للأعمال</h4>
              <nav className="flex flex-col gap-4 text-slate-300 font-bold text-sm md:text-lg">
                <Link to="/business" className="hover:text-white transition-colors">انضم إلينا</Link>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const MobileNavItem: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick: () => void }> = ({ to, icon, label, onClick }) => (
  <Link to={to} onClick={onClick} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all text-xl font-black text-slate-900">
    <span className="text-slate-300">{icon}</span> {label}
  </Link>
);

const NavButton: React.FC<{ to: string, icon: React.ReactNode, label: string, active?: boolean }> = ({ to, icon, label, active }) => (
  <Link to={to} className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${active ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-black hover:bg-slate-50'}`}>
    {icon} <span>{label}</span>
  </Link>
);

export default PublicLayout;
