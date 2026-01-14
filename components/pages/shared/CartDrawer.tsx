
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Trash2, CreditCard, Loader2, CheckCircle2, Plus, Minus } from 'lucide-react';
import { ApiService } from '@/services/api.service';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  shopId: string;
  shopName: string;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string) => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, items, onRemove }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [localItems, setLocalItems] = useState<CartItem[]>(items);

  React.useEffect(() => {
    // نضمن أننا نقبل فقط المصفوفات الصالحة لتجنب الأخطاء
    if (Array.isArray(items)) {
      setLocalItems(items);
    }
  }, [items]);

  const updateQuantity = (id: string, delta: number) => {
    setLocalItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const groupedItems = localItems.reduce((acc, item) => {
    const sId = String(item.shopId || 'unknown');
    if (!acc[sId]) {
      acc[sId] = { name: String(item.shopName || 'متجر'), items: [] };
    }
    acc[sId].items.push(item);
    return acc;
  }, {} as Record<string, { name: string; items: CartItem[] }>);

  const total = localItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);

  const handleCheckout = async () => {
    if (localItems.length === 0) return;
    setIsProcessing(true);
    setError('');
    
    try {
      for (const [shopId, shop] of Object.entries(groupedItems)) {
        const items = (shop as any)?.items || [];
        const shopTotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
        await ApiService.placeOrder({
          shopId,
          items,
          total: shopTotal,
          paymentMethod: 'card'
        });
      }
      setIsProcessing(false);
      setShowSuccess(true);
      window.dispatchEvent(new Event('orders-updated'));
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        window.location.reload(); 
      }, 2500);
    } catch (err: any) {
      setIsProcessing(false);
      setError(err?.message || 'يجب تسجيل الدخول لإتمام الشراء');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[201] shadow-2xl flex flex-col text-right" dir="rtl">
            <header className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-black flex items-center gap-4">
                <ShoppingBag className="w-8 h-8 text-[#00E5FF]" /> سلة التسوق
              </h2>
              <button onClick={onClose} className="p-3 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                <X size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {showSuccess ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                   <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
                      <CheckCircle2 size={48} className="text-white" />
                   </div>
                   <h3 className="text-3xl font-black mb-4">تم تأكيد طلبك!</h3>
                   <p className="text-slate-400 font-bold">جاري إخطار المحل لتجهيز طلبك فوراً.</p>
                </div>
              ) : localItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-200">
                  <ShoppingBag size={80} className="mb-6 opacity-10" />
                  <p className="font-black text-xl">سلتك فارغة تماماً</p>
                </div>
              ) : (
                Object.entries(groupedItems).map(([shopId, shop]: [string, any]) => (
                  <div key={shopId} className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                       <span className="text-[10px] font-black bg-[#00E5FF] px-2 py-1 rounded text-black">متجر</span>
                       <h3 className="font-black text-xl text-slate-900">{String(shop.name)}</h3>
                    </div>
                    {shop.items.map((item: CartItem) => (
                      <div key={item.id} className="flex flex-col gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between flex-row-reverse">
                          <div className="text-right">
                            <p className="font-black text-sm">{String(item.name)}</p>
                            <p className="text-[#00E5FF] font-black text-xs">ج.م {Number(item.price)}</p>
                          </div>
                          <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between flex-row-reverse">
                           <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                              <button onClick={() => updateQuantity(item.id, 1)} className="text-slate-900 hover:text-[#00E5FF]"><Plus size={16} /></button>
                              <span className="font-black text-sm w-4 text-center">{Number(item.quantity)}</span>
                              <button onClick={() => updateQuantity(item.id, -1)} className="text-slate-900 hover:text-red-500"><Minus size={16} /></button>
                           </div>
                           <p className="font-black text-lg text-slate-900">ج.م {Number(item.price) * Number(item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            {!showSuccess && localItems.length > 0 && (
              <footer className="p-8 border-t border-slate-100 bg-slate-50 space-y-6">
                {error && <p className="text-red-500 text-xs font-bold text-center">{String(error)}</p>}
                <div className="flex justify-between items-center flex-row-reverse">
                  <span className="font-black text-slate-400">الإجمالي الكلي</span>
                  <span className="text-4xl font-black tracking-tighter">ج.م {total}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 hover:bg-black transition-all shadow-2xl disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <>إتمام الشراء الآن <CreditCard size={24} /></>}
                </button>
              </footer>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
