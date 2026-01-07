
import React, { useState, useEffect } from 'react';
import { Users, Search, MoreVertical, Shield, User, Trash2, ShieldCheck, ArrowLeftRight, Loader2, X, RefreshCw } from 'lucide-react';
import { ApiService } from '../services/api.service';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toaster';

const MotionDiv = motion.div as any;

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const { addToast } = useToast();

  const loadUsers = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const data = await ApiService.getAllUsers();
      setUsers(data);
    } catch (e) {
      addToast('فشل تحميل قائمة المستخدمين', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟')) return;
    try {
      await ApiService.deleteUser(userId);
      addToast('تم حذف المستخدم بنجاح', 'success');
      // تحديث فوري للقائمة
      await loadUsers(true);
    } catch (e) {
      addToast('فشل حذف المستخدم', 'error');
    }
    setActiveMenu(null);
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'customer' ? 'merchant' : 'customer';
    try {
      await ApiService.updateUserRole(userId, newRole);
      addToast(`تم تغيير دور المستخدم إلى ${newRole === 'merchant' ? 'تاجر' : 'عميل'}`, 'success');
      // تحديث فوري للقائمة
      await loadUsers(true);
    } catch (e) {
      addToast('فشل تغيير الصلاحيات', 'error');
    }
    setActiveMenu(null);
  };

  // فلترة المستخدمين بناءً على كلمة البحث
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-white">إدارة المستخدمين</h2>
              {isRefreshing && <RefreshCw size={16} className="text-[#00E5FF] animate-spin" />}
            </div>
            <p className="text-slate-500 text-sm font-bold">عرض وإدارة صلاحيات كافة أعضاء المنصة.</p>
          </div>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input 
            className="w-full bg-slate-900 border border-white/5 rounded-xl py-3 pr-12 pl-4 text-white outline-none focus:border-[#00E5FF]/50 transition-all text-sm" 
            placeholder="ابحث بالاسم أو البريد..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#00E5FF] w-10 h-10" /></div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-24 text-center">
            <User size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
            <p className="text-slate-500 font-bold">لم يتم العثور على مستخدمين يطابقون بحثك.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-6 text-slate-400 font-black text-xs uppercase tracking-widest">المستخدم</th>
                  <th className="p-6 text-slate-400 font-black text-xs uppercase tracking-widest">نوع الحساب</th>
                  <th className="p-6 text-slate-400 font-black text-xs uppercase tracking-widest">البريد الإلكتروني</th>
                  <th className="p-6 text-slate-400 font-black text-xs uppercase tracking-widest text-left">التحكم</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4 flex-row-reverse">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-[#00E5FF] border border-white/5">
                          {user.name.charAt(0)}
                        </div>
                        <span className="text-white font-bold group-hover:text-[#00E5FF] transition-colors">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${
                        user.role === 'admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                        user.role === 'merchant' ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {user.role === 'admin' ? 'مدير' : user.role === 'merchant' ? 'تاجر' : 'عميل'}
                      </span>
                    </td>
                    <td className="p-6 text-slate-500 text-sm font-medium">{user.email}</td>
                    <td className="p-6 relative text-left">
                      <button 
                        onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                        className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                      >
                        <MoreVertical size={18} />
                      </button>

                      <AnimatePresence>
                        {activeMenu === user.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                            <MotionDiv
                              initial={{ opacity: 0, scale: 0.9, x: -10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.9, x: -10 }}
                              className="absolute left-12 top-0 mt-2 w-52 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-20 overflow-hidden"
                            >
                              <button 
                                onClick={() => handleChangeRole(user.id, user.role)}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 text-slate-300 text-xs font-bold transition-all"
                              >
                                {user.role === 'customer' ? 'ترقية لتاجر' : 'تنزيل لعميل'} 
                                <ArrowLeftRight size={14} className="text-[#00E5FF]" />
                              </button>
                              <button 
                                onClick={() => handleDelete(user.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-red-500/10 text-red-400 text-xs font-bold transition-all border-t border-white/5"
                              >
                                حذف الحساب نهائياً <Trash2 size={14} />
                              </button>
                            </MotionDiv>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
