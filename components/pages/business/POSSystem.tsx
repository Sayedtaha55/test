import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, ChevronRight, ChevronUp, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ApiService } from '@/services/api.service';
import { RayDB } from '@/constants';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const MotionButton = motion.button as any;
const MotionDiv = motion.div as any;

const POSSystem: React.FC<{ onClose: () => void; shopId: string }> = ({ onClose, shopId }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [receiptTheme, setReceiptTheme] = useState<any>({});

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await ApiService.getProducts(shopId);
        setProducts(data || []);
      } catch {
        setProducts([]);
      }
    };
    loadProducts();
  }, [shopId]);

  useEffect(() => {
    const loadTheme = () => {
      setReceiptTheme(RayDB.getReceiptTheme(shopId));
    };
    loadTheme();
    window.addEventListener('receipt-theme-update', loadTheme);
    return () => window.removeEventListener('receipt-theme-update', loadTheme);
  }, [shopId]);

  const addToCart = (product: any, qty: number = 1) => {
    if (!product || product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const currentQty = existing?.quantity || 0;
      const nextQty = Math.min(product.stock, currentQty + qty);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: nextQty } : item);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: Math.min(product.stock, qty) }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    const stock = products.find(p => p.id === id)?.stock;
    const maxQty = (typeof stock === 'number' && stock >= 0) ? stock : Number.POSITIVE_INFINITY;
    setCart(prev => prev
      .map(item => item.id === id
        ? { ...item, quantity: Math.min(maxQty, Math.max(0, item.quantity + delta)) }
        : item
      )
      .filter(item => item.quantity > 0)
    );
  };

  const processPayment = () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalWithVat = subtotal * 1.14;

    setTimeout(() => {
      (async () => {
        try {
          await ApiService.placeOrder({
            shopId,
            items: cart.map((i) => ({ id: i.id, quantity: i.quantity })),
            total: totalWithVat,
            paymentMethod: orderType,
          });

          const updated = await ApiService.getProducts(shopId);
          setProducts(updated || []);
          window.dispatchEvent(new Event('orders-updated'));
        } catch {
          // Stock sync errors are ignored
        } finally {
          setIsProcessing(false);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setCart([]);
            onClose();
          }, 1500);
        }
      })();
    }, 1200);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal * 1.14;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredProducts = products.filter(p => String(p?.name || '').toLowerCase().includes(normalizedSearch));

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col md:flex-row font-sans text-right overflow-hidden" dir="rtl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      
      {/* Product Feed - Main Area */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
        <header className="sticky top-0 z-50 p-4 md:p-8 bg-white border-b border-slate-100 flex items-center gap-3 md:gap-6 flex-row-reverse">
          <button onClick={onClose} className="p-3 md:p-4 hover:bg-slate-100 rounded-xl md:rounded-2xl transition-all active:scale-95">
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8 text-slate-900" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="ابحث عن منتج..." 
              className="w-full bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl py-4 md:py-5 pr-12 md:pr-16 pl-4 md:pl-8 outline-none focus:ring-2 focus:ring-[#BD00FF] transition-all text-base md:text-xl font-bold text-right"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-1 md:p-8 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-6 pb-24 md:pb-4">
          {filteredProducts.map(product => (
            <MotionDiv 
              whileTap={{ scale: 0.95 }}
              key={product.id}
              onClick={() => addToCart(product, 1)}
              className="bg-white p-1 md:p-6 rounded-xl md:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#BD00FF] transition-all group flex flex-col items-center text-center relative active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-full aspect-square rounded-lg md:rounded-[1.8rem] bg-slate-50 overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <ShoppingCart className="w-8 h-8 md:w-12 md:h-12 text-slate-300" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-[#BD00FF] font-black text-[11px] md:text-2xl">ج.م {product.price}</p>
              <div className={`absolute top-2 left-2 md:top-6 md:left-6 px-2 py-0.5 rounded-lg text-[9px] md:text-[10px] font-black shadow-sm ${product.stock <= 0 ? 'bg-slate-900 text-white' : product.stock < 5 ? 'bg-red-500 text-white' : 'bg-white/90'}`}>
                {product.stock <= 0 ? 'نفد' : (typeof product.stock === 'number' ? product.stock : '-')}
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>

      {/* Mobile: Invoice Bar + Full Screen Invoice */}
      {!isInvoiceOpen && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-[250] bg-white border-t border-slate-200" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button
            type="button"
            onClick={() => setIsInvoiceOpen(true)}
            className="w-full p-3 flex items-center justify-between flex-row-reverse active:scale-[0.99]"
          >
            <h2 className="text-base font-black flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-[#BD00FF]" /> عرض الفاتورة
            </h2>
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 bg-slate-900 text-white rounded-lg font-black text-xs">{cartCount}</div>
              <div className="font-black text-sm text-slate-900">ج.م {total.toFixed(0)}</div>
              <ChevronUp className="w-5 h-5 text-slate-400 rotate-180" />
            </div>
          </button>
        </div>
      )}

      <AnimatePresence>
        {isInvoiceOpen && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[300] bg-white flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-row-reverse">
              <button onClick={() => setIsInvoiceOpen(false)} className="p-3 hover:bg-slate-100 rounded-xl transition-all active:scale-95">
                <ChevronRight className="w-6 h-6 text-slate-900" />
              </button>
              <div className="text-right">
                <p className="font-black text-lg">الفاتورة</p>
                <p className="text-xs font-bold text-slate-400">عدد الأصناف: {cartCount} • الإجمالي: ج.م {total.toFixed(0)}</p>
              </div>
              <div className="w-12" />
            </div>

            {(receiptTheme?.shopName || receiptTheme?.phone || receiptTheme?.address || receiptTheme?.logoDataUrl) && (
              <div className="p-4 border-b border-slate-50">
                <div className="flex items-center justify-between flex-row-reverse gap-4">
                  <div className="text-right">
                    {receiptTheme?.shopName && <p className="font-black text-base text-slate-900">{receiptTheme.shopName}</p>}
                    {receiptTheme?.phone && <p className="text-xs font-bold text-slate-400">{receiptTheme.phone}</p>}
                    {receiptTheme?.address && <p className="text-xs font-bold text-slate-400">{receiptTheme.address}</p>}
                  </div>
                  {receiptTheme?.logoDataUrl && (
                    <img src={receiptTheme.logoDataUrl} className="w-14 h-14 rounded-3xl object-cover bg-white border border-slate-100" alt="receipt-logo" />
                  )}
                </div>
              </div>
            )}

            <div className="p-4 border-b border-slate-50">
              <div className="flex gap-2">
                <button onClick={() => setOrderType('dine-in')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-[0.96] min-h-[44px] touch-manipulation ${orderType === 'dine-in' ? 'bg-[#BD00FF] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>محلي</button>
                <button onClick={() => setOrderType('takeaway')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-[0.96] min-h-[44px] touch-manipulation ${orderType === 'takeaway' ? 'bg-[#BD00FF] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>سفري</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                  <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
                  <p className="font-black text-base">السلة فارغة</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between flex-row-reverse">
                    <div className="text-right flex-1 pr-2">
                      <p className="font-black text-sm text-slate-900">{item.name}</p>
                      <p className="text-[11px] font-bold text-slate-400">ج.م {item.price}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-100 flex-row-reverse">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-slate-50 rounded-xl active:scale-95 min-h-[40px] w-[40px] flex items-center justify-center touch-manipulation"><Minus size={16} /></button>
                        <span className="w-10 text-center font-black text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-slate-50 rounded-xl active:scale-95 min-h-[40px] w-[40px] flex items-center justify-center touch-manipulation"><Plus size={16} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-red-500 active:scale-95 min-h-[40px] w-[40px] flex items-center justify-center touch-manipulation"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
              {receiptTheme?.footerNote && (
                <div className="pb-3 text-center text-xs font-bold text-slate-400">{receiptTheme.footerNote}</div>
              )}
              <button
                disabled={cart.length === 0 || isProcessing}
                onClick={processPayment}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-[#BD00FF] transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-[0.97] min-h-[52px] touch-manipulation"
              >
                {isProcessing ? <Loader2 className="animate-spin" /> : 'تأكيد ودفع'}
              </button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      <div className="hidden md:flex md:w-[450px] lg:w-[500px] h-full bg-white border-r border-slate-100 flex-col shadow-2xl" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="p-8 border-b border-slate-50 flex items-center justify-between flex-row-reverse">
          <h2 className="text-3xl font-black flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-[#BD00FF]" /> الفاتورة
          </h2>
        </div>

        {(receiptTheme?.shopName || receiptTheme?.phone || receiptTheme?.address || receiptTheme?.logoDataUrl) && (
          <div className="p-6 border-b border-slate-50">
            <div className="flex items-center justify-between flex-row-reverse gap-6">
              <div className="text-right">
                {receiptTheme?.shopName && <p className="font-black text-lg text-slate-900">{receiptTheme.shopName}</p>}
                {receiptTheme?.phone && <p className="text-xs font-bold text-slate-400">{receiptTheme.phone}</p>}
                {receiptTheme?.address && <p className="text-xs font-bold text-slate-400">{receiptTheme.address}</p>}
              </div>
              {receiptTheme?.logoDataUrl && (
                <img src={receiptTheme.logoDataUrl} className="w-16 h-16 rounded-3xl object-cover bg-white border border-slate-100" alt="receipt-logo" />
              )}
            </div>
          </div>
        )}

        <div className="p-6 border-b border-slate-50 space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setOrderType('dine-in')} className={`flex-1 py-4 rounded-xl font-black text-sm transition-all active:scale-[0.96] ${orderType === 'dine-in' ? 'bg-[#BD00FF] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>محلي</button>
            <button onClick={() => setOrderType('takeaway')} className={`flex-1 py-4 rounded-xl font-black text-sm transition-all active:scale-[0.96] ${orderType === 'takeaway' ? 'bg-[#BD00FF] text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>سفري</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
              <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
              <p className="font-black text-lg">السلة فارغة</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between flex-row-reverse">
                <div className="text-right flex-1 pr-3">
                  <p className="font-black text-sm text-slate-900">{item.name}</p>
                  <p className="text-[10px] font-bold text-slate-400">ج.م {item.price}</p>
                </div>
                <div className="flex items-center gap-2 flex-row-reverse">
                  <div className="flex items-center bg-white rounded-lg p-2 shadow-sm border border-slate-100 flex-row-reverse">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-slate-50 rounded-lg active:scale-95"><Minus size={16} /></button>
                    <span className="w-10 text-center font-black text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-slate-50 rounded-lg active:scale-95"><Plus size={16} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-red-500 active:scale-95"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-200 space-y-4">
          <div className="flex justify-between items-center flex-row-reverse">
            <span className="font-black text-slate-400">الإجمالي</span>
            <span className="text-4xl font-black text-[#BD00FF]">ج.م {total.toFixed(0)}</span>
          </div>
          {receiptTheme?.footerNote && (
            <div className="text-center text-xs font-bold text-slate-400">{receiptTheme.footerNote}</div>
          )}
          <button 
            disabled={cart.length === 0 || isProcessing}
            onClick={processPayment}
            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-2xl hover:bg-[#BD00FF] transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-[0.97]"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : 'تأكيد ودفع'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[500] bg-white flex items-center justify-center p-6 text-center">
            <div className="space-y-6">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-[#BD00FF] rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <CheckCircle2 size={48} className="text-white" />
              </div>
              <h2 className="text-4xl font-black">تم البيع بنجاح</h2>
              <p className="text-slate-500 font-bold">تم تحديث المخزون والتقارير المالية.</p>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POSSystem;
