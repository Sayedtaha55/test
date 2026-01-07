import { createClient } from '@supabase/supabase-js';

/**
 * إعدادات الربط مع Supabase
 * يتم جلب القيم من ملف .env
 */

const supabaseUrl = process.env.SUPABASE_URL || 'https://lsuewzeyfqmoqxflllmb.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_4OCOBp9kLIUIT_gHZ8LOyw_okG070t0';

// إنشاء العميل
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});