
import React, { useEffect, useState } from 'react';
import { Search, MapPin, Store, ChevronLeft } from 'lucide-react';
import { Category } from '@/types';
import { motion } from 'framer-motion';
import * as ReactRouterDOM from 'react-router-dom';
import { ApiService } from '@/services/api.service';

const { Link } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

const ShopsPage: React.FC = () => {
  const [governorate, setGovernorate] = useState('الكل');
  const [search, setSearch] = useState('');

  const [shopsList, setShopsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    ApiService.getShops('approved')
      .then((data: any[]) => {
        if (!mounted) return;
        setShopsList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setShopsList([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const shops = shopsList
    .filter((s) => String(s?.status || '').toLowerCase() === 'approved')
    .filter(
      (s) =>
        s.category === Category.RETAIL &&
        (governorate === 'الكل' || s.governorate === governorate) &&
        String(s?.name || '').toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-12 text-right" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-10 md:mb-16">
        <div className="text-center md:text-right w-full">
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter mb-4 leading-tight">اكتشف <span className="text-[#00E5FF]">المحلات.</span></h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium">أفضل متاجر الملابس والإلكترونيات في منطقتك.</p>
        </div>
        <div className="w-full md:w-96 relative">
           <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
           <input 
             type="text" 
             placeholder="ابحث عن محل..." 
             className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pr-14 pl-6 outline-none focus:ring-2 focus:ring-[#00E5FF] transition-all font-bold text-sm md:text-base"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
        </div>
      </div>

      {/* Filter Bar - Horizontal Scroll on Mobile */}
      <div className="flex overflow-x-auto no-scrollbar gap-3 mb-10 md:mb-16 pb-2">
         {['الكل', 'القاهرة', 'الجيزة', 'الإسكندرية'].map(g => (
           <button 
             key={g}
             onClick={() => setGovernorate(g)}
             className={`px-6 md:px-8 py-2 md:py-3 rounded-xl font-black text-xs md:text-sm transition-all whitespace-nowrap ${governorate === g ? 'bg-black text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
           >
             {g}
           </button>
         ))}
      </div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
        {loading ? (
          <div className="text-slate-400 font-bold">جاري التحميل...</div>
        ) : shops.length === 0 ? (
          <div className="text-slate-400 font-bold">لا توجد محلات حالياً</div>
        ) : (
          shops.map((shop, idx) => (
          <MotionDiv 
            key={shop.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group bg-white border border-slate-100 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] hover:shadow-2xl transition-all flex flex-col gap-6 md:gap-8"
          >
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl overflow-hidden border border-slate-100 shrink-0">
                <img src={shop.logoUrl || shop.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200'} className="w-full h-full object-cover" alt={shop.name} />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black mb-1">{shop.name}</h3>
                <p className="text-slate-400 text-xs md:text-sm font-bold flex items-center gap-1">
                  <MapPin size={14} /> {shop.city}
                </p>
              </div>
            </div>
            
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-50">
               <img src={shop?.pageDesign?.bannerUrl || shop?.bannerUrl || shop?.banner_url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="banner" />
               <div className="absolute inset-0 bg-black/10" />
            </div>

            <Link 
              to={`/shop/${shop.slug}`}
              className="w-full py-4 md:py-5 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 group-hover:bg-[#00E5FF] group-hover:text-black transition-all"
            >
              زيارة المتجر <ChevronLeft size={18} />
            </Link>
          </MotionDiv>
          ))
        )}
      </div>
    </div>
  );
};

export default ShopsPage;
