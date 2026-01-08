
import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { RayDB } from '../constants';
import { Product, Offer, Shop } from '../types';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, CalendarCheck, ArrowRight, Heart, 
  Share2, ShieldCheck, Truck, Package, Store, Loader2, AlertCircle, Home
} from 'lucide-react';
import ReservationModal from './ReservationModal';

const { useParams, useNavigate, Link } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

const ProductPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(false);
      try {
        const p = await RayDB.getProductById(id);
        if (!p) {
          const offers = await RayDB.getOffers();
          const o = offers.find(off => off.id === id);
          if (o) {
            const products = await RayDB.getProducts();
            const originalProduct = products.find(prod => prod.name === o.title);
            if (originalProduct) setProduct(originalProduct);
            setOffer(o);
            const shops = await RayDB.getShops();
            setShop(shops.find(s => s.id === o.shopId) || null);
          } else {
            setError(true);
          }
        } else {
          setProduct(p);
          const o = await RayDB.getOfferByProductId(p.id);
          if (o) setOffer(o);
          
          const shops = await RayDB.getShops();
          setShop(shops.find(s => s.id === (p as any).shop_id) || shops[0]);
          
          const favs = RayDB.getFavorites();
          setIsFavorite(favs.includes(p.id));
        }
      } catch (err) {
        // Error loading product - handled silently
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    window.scrollTo(0, 0);
  }, [id, navigate]);

  const toggleFavorite = () => {
    if (product) {
      const state = RayDB.toggleFavorite(product.id);
      setIsFavorite(state);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    const event = new CustomEvent('add-to-cart', { 
      detail: { 
        ...product, 
        quantity: 1, 
        shopId: shop?.id, 
        shopName: shop?.name 
      } 
    });
    window.dispatchEvent(event);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-[#00E5FF] animate-spin mb-4" />
        <h2 className="text-xl font-black">جاري جلب المنتج...</h2>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-6" />
        <h2 className="text-2xl font-black mb-4">عفواً، المنتج غير متاح</h2>
        <p className="text-slate-500 font-bold mb-8">ربما تم حذفه أو أن الرابط غير صحيح.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-2"
        >
          <Home size={18} /> العودة للرئيسية
        </button>
      </div>
    );
  }

  const currentPrice = offer ? offer.newPrice : product.price;
  const hasDiscount = !!offer;

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-20 text-right font-sans" dir="rtl">
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 font-black mb-12 hover:text-black transition-all"
      >
        <ArrowRight size={20} /> العودة للسابق
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 md:gap-24">
        {/* Left: Image Gallery */}
        <MotionDiv 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative aspect-square rounded-[4rem] overflow-hidden bg-slate-50 border border-slate-100 shadow-2xl"
        >
          <img src={product.imageUrl || (product as any).image_url} className="w-full h-full object-cover" alt={product.name} />
          {hasDiscount && (
            <div className="absolute top-10 left-10 bg-[#BD00FF] text-white px-8 py-3 rounded-2xl font-black text-xl shadow-2xl">
              -{offer?.discount}%
            </div>
          )}
          <button 
            onClick={toggleFavorite}
            className={`absolute top-10 right-10 p-5 rounded-3xl backdrop-blur-md transition-all ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/40 text-slate-900 hover:bg-white'}`}
          >
            <Heart size={28} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </MotionDiv>

        {/* Right: Info */}
        <MotionDiv 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-12"
        >
          <div className="space-y-4">
             {shop && (
               <Link to={`/shop/${shop.slug}`} className="inline-flex items-center gap-3 bg-slate-50 px-6 py-2 rounded-full border border-slate-100 group">
                  <img src={shop.logoUrl || (shop as any).logo_url} className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-sm font-black text-slate-900 group-hover:text-[#00E5FF] transition-colors">{shop.name}</span>
               </Link>
             )}
             <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">{product.name}</h1>
             <div className="flex items-center gap-6">
                <span className="text-4xl md:text-6xl font-black text-[#00E5FF] tracking-tighter">ج.م {currentPrice}</span>
                {hasDiscount && (
                  <span className="text-2xl md:text-3xl text-slate-300 line-through font-bold">ج.م {product.price}</span>
                )}
             </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#BD00FF] shadow-sm">
                   <Package size={24} />
                </div>
                <div>
                   <p className="font-black text-slate-900">حالة المخزون</p>
                   <p className="text-sm text-slate-400 font-bold">{product.stock > 0 ? `متوفر (${product.stock} قطعة)` : 'نفذت الكمية'}</p>
                </div>
             </div>
             
             <div className="flex flex-col md:flex-row gap-4">
                <button 
                  onClick={handleAddToCart}
                  className="flex-1 py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-4"
                >
                  <ShoppingCart size={28} /> أضف للسلة
                </button>
                <button 
                  onClick={() => setIsResModalOpen(true)}
                  className="flex-1 py-6 bg-[#00E5FF] text-black rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-4"
                >
                  <CalendarCheck size={28} /> حجز العرض
                </button>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-12 border-t border-slate-100">
             <div className="flex items-center gap-4">
                <Truck className="text-slate-300" />
                <div>
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">توصيل سريع</p>
                   <p className="font-bold text-sm">خلال ٢٤-٤٨ ساعة</p>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <ShieldCheck className="text-slate-300" />
                <div>
                   <p className="text-xs font-black uppercase tracking-widest text-slate-400">ضمان تست</p>
                   <p className="font-bold text-sm">منتج أصلي ١٠٠٪</p>
                </div>
             </div>
          </div>
        </MotionDiv>
      </div>

      <ReservationModal 
        isOpen={isResModalOpen} 
        onClose={() => setIsResModalOpen(false)} 
        item={{
          id: product.id,
          name: product.name,
          image: product.imageUrl || (product as any).image_url,
          price: currentPrice,
          shopId: shop?.id || 's1',
          shopName: shop?.name || 'تست'
        }}
      />
    </div>
  );
};

export default ProductPage;
