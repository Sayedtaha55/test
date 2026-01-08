
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ShieldCheck, Loader2, AlertCircle, KeyRound, X, Sparkles, UserPlus, Store } from 'lucide-react';
import * as ReactRouterDOM from 'react-router-dom';
import { ApiService } from '../services/api.service';
import { useToast } from './Toaster';

const { Link, useNavigate } = ReactRouterDOM as any;
const MotionDiv = motion.div as any;

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isForgotModalOpen, setForgotModalOpen] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await ApiService.login(email, password);
      localStorage.setItem('ray_user', JSON.stringify(response.user));
      localStorage.setItem('ray_token', response.session?.access_token || '');
      window.dispatchEvent(new Event('auth-change'));
      
      addToast(`أهلاً بك مجدداً، ${response.user.name}`, 'success');

      if (response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (response.user.role === 'merchant') {
        navigate('/business/dashboard');
      } else {
        navigate('/profile');
      }
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول، تأكد من بياناتك');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-20 flex items-center justify-center min-h-[80vh]">
      <MotionDiv 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white border border-slate-100 p-8 md:p-16 rounded-[3.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] text-right"
      >
        <div className="flex flex-col items-center text-center mb-12">
           <div 
              onClick={() => navigate('/admin/gate')}
              className="w-20 h-20 bg-[#1A1A1A] rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl relative group overflow-hidden cursor-pointer"
           >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00E5FF] to-[#BD00FF] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="text-white font-black text-4xl relative z-10">R</span>
           </div>
           <h1 className="text-4xl font-black tracking-tighter mb-4">أهلاً بك <span className="text-[#00E5FF]">مجدداً.</span></h1>
           <p className="text-slate-400 font-bold text-sm">سجل دخولك أو افتح حساب نشاط تجاري جديد.</p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 border-r-4 border-red-500 p-4 mb-8 flex items-center gap-3 flex-row-reverse text-red-600 font-bold text-sm">
              <AlertCircle size={20} />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mr-4">البريد الإلكتروني</label>
            <input 
              type="email" required disabled={loading}
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-5 px-6 outline-none focus:bg-white focus:border-[#00E5FF]/20 transition-all font-black text-right"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center flex-row-reverse mr-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">كلمة المرور</label>
              <button type="button" onClick={() => setForgotModalOpen(true)} className="text-[10px] font-black text-[#BD00FF]">نسيت كلمة المرور؟</button>
            </div>
            <input 
              type="password" required disabled={loading}
              className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-5 px-6 outline-none focus:bg-white focus:border-[#00E5FF]/20 transition-all font-black text-right"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24} className="text-[#00E5FF]" />}
            {loading ? 'جاري التحقق...' : 'دخول آمن'}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-50 space-y-4">
           <p className="text-center text-slate-400 font-bold text-xs mb-4">ليس لديك حساب؟</p>
           <div className="grid grid-cols-2 gap-4">
              <Link to="/signup" className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
                 <UserPlus size={20} className="text-slate-900" />
                 <span className="font-black text-[10px]">تسجيل زبون</span>
              </Link>
              <Link to="/signup?role=merchant" className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all">
                 <Store size={20} className="text-[#BD00FF]" />
                 <span className="font-black text-[10px]">تسجيل نشاط</span>
              </Link>
           </div>
        </div>
      </MotionDiv>
    </div>
  );
};

export default LoginPage;
