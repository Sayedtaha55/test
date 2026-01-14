
import React, { useEffect, useState } from 'react';
import { Search, MapPin, Grid, List, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import * as ReactRouterDOM from 'react-router-dom';
import { ApiService } from '@/services/api.service';

const { Link } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

const FilterPage: React.FC = () => {
  const [governorate, setGovernorate] = useState('All');
  const [category, setCategory] = useState('All');

  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    ApiService.getShops('approved')
      .then((data: any[]) => {
        if (!mounted) return;
        setShops(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setShops([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredShops = shops
    .filter((s) => String(s?.status || '').toLowerCase() === 'approved')
    .filter(
      (shop) =>
        (governorate === 'All' || shop.governorate === governorate) &&
        (category === 'All' || shop.category === category),
    );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-12">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 space-y-8">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Governorate</h3>
            <div className="space-y-2">
              {['All', 'Cairo', 'Giza', 'Alexandria', 'Luxor'].map(g => (
                <button 
                  key={g}
                  onClick={() => setGovernorate(g)}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${governorate === g ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Category</h3>
            <div className="space-y-2">
              {['All', 'RETAIL', 'RESTAURANT', 'SERVICE'].map(c => (
                <button 
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${category === c ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
                >
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Results Grid */}
        <div className="flex-1">
          <header className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-black uppercase tracking-tight">
              {filteredShops.length} STORES FOUND
            </h2>
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <button className="p-2 bg-white rounded-lg shadow-sm"><Grid className="w-4 h-4" /></button>
              <button className="p-2 text-slate-400"><List className="w-4 h-4" /></button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {loading ? (
              <div className="text-slate-400 font-bold">Loading...</div>
            ) : filteredShops.length === 0 ? (
              <div className="text-slate-400 font-bold">No stores found</div>
            ) : (
              filteredShops.map((shop, idx) => (
              <MotionDiv 
                key={shop.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-white border border-slate-100 p-6 rounded-[2rem] hover:shadow-2xl hover:shadow-cyan-50 transition-all flex gap-6"
              >
                <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0">
                  <img src={shop.logoUrl || shop.logo_url || 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={shop.name} />
                </div>
                <div className="flex-1 flex flex-col justify-between py-2">
                  <div>
                    <span className="text-[10px] font-black text-[#BD00FF] uppercase tracking-[0.2em]">{shop.category}</span>
                    <h4 className="text-2xl font-black mt-1 mb-1">{shop.name}</h4>
                    <p className="text-slate-400 text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {shop.city}, {shop.governorate}
                    </p>
                  </div>
                  <Link 
                    to={`/shop/${shop.slug}`}
                    className="flex items-center gap-2 text-sm font-black text-[#00E5FF] hover:gap-4 transition-all"
                  >
                    VISIT STORE <span className="text-xl">→</span>
                  </Link>
                </div>
              </MotionDiv>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPage;
