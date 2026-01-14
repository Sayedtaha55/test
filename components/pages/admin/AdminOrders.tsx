import React, { useState, useEffect } from 'react';
import { CreditCard, Search, MoreVertical, DollarSign, Loader2, Filter, ShoppingBag } from 'lucide-react';
import { ApiService } from '@/services/api.service';

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await ApiService.getAllOrders();
        setOrders(data);
      } catch (e) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
            <CreditCard size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white">إدارة العمليات</h2>
            <p className="text-slate-500 text-sm font-bold">مراقبة كافة المبيعات والتدفق المالي.</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input className="w-full bg-slate-900 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-white outline-none focus:border-[#00E5FF]/50 transition-all text-sm" placeholder="ابحث برقم الفاتورة..." />
        </div>
      </div>

      <div className="bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#00E5FF]" /></div>
        ) : (
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="p-6 text-slate-400 font-black text-xs uppercase tracking-widest">رقم العملية</th>
                <th className="p-6 text-slate-400 font-black text-xs uppercase tracking-widest">التاريخ</th>
                <th className="p-6 text-slate-400 font-black text-xs uppercase tracking-widest">المبلغ</th>
                <th className="p-6 text-slate-400 font-black text-xs uppercase tracking-widest">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-6 font-black text-white">#{order.id.slice(0, 8)}</td>
                  <td className="p-6 text-slate-500 text-sm">{new Date(order.created_at).toLocaleString('ar-EG')}</td>
                  <td className="p-6">
                    <span className="text-[#00E5FF] font-black">ج.م {order.total.toLocaleString()}</span>
                  </td>
                  <td className="p-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                      order.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {order.status === 'completed' ? 'ناجحة' : 'قيد المراجعة'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
