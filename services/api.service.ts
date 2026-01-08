
import { supabase } from './supabase';
import { Shop, Product, Offer, Reservation, Category } from '../types';
import { MOCK_SHOPS } from '../constants';

export const ApiService = {
  // --- Auth Section ---
  async login(email: string, pass: string) {
    if (email.toLowerCase() === 'admin' && pass === '1234') {
      const adminUser = {
        id: 'admin-root-001',
        email: 'admin@ray.test',
        name: 'مدير النظام (Root)',
        role: 'admin',
        shopId: null
      };
      localStorage.setItem('ray_user', JSON.stringify(adminUser));
      return { user: adminUser, session: { access_token: 'root-access-granted' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });

    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const userData = {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || 'مستخدم تست',
      role: profile?.role || 'customer',
      shopId: profile?.shop_id
    };

    localStorage.setItem('ray_user', JSON.stringify(userData));
    return { user: userData, session: data.session };
  },

  async signup(data: any) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email.toLowerCase(),
      password: data.password,
    });

    if (authError) throw authError;

    if (authData.user) {
      let shopId = null;
      if (data.role === 'merchant') {
        const { data: shop, error: shopError } = await supabase
          .from('shops')
          .insert({
            name: data.shopName,
            slug: data.shopName.toLowerCase().replace(/\s+/g, '-'),
            category: data.category,
            governorate: data.governorate,
            city: data.city,
            status: 'pending',
            logo_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.shopName)}&background=00E5FF`,
            page_design: { primaryColor: '#00E5FF', layout: 'modern', bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200' }
          })
          .select().single();

        if (shopError) throw shopError;
        shopId = shop.id;
      }

      await supabase.from('profiles').insert({
        id: authData.user.id,
        name: data.name,
        role: data.role,
        shop_id: shopId
      });
    }
    return { user: authData.user, session: authData.session };
  },

  // --- Chat System Section ---
  async sendMessage(msg: { shopId: string, senderId: string, senderName: string, text: string, role: 'customer' | 'merchant' }) {
    const { error } = await supabase.from('messages').insert({
      shop_id: msg.shopId,
      sender_id: msg.senderId,
      sender_name: msg.senderName,
      content: msg.text,
      role: msg.role,
      created_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  },

  async getMessages(shopId: string, userId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('shop_id', shopId)
      .or(`sender_id.eq.${userId},role.eq.merchant`)
      .order('created_at', { ascending: true });
    return data || [];
  },

  async getMerchantChats(shopId: string) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    
    const chatsMap = new Map();
    (data || []).forEach(m => {
      if (m.role === 'customer' && !chatsMap.has(m.sender_id)) {
        chatsMap.set(m.sender_id, {
          userId: m.sender_id,
          userName: m.sender_name,
          lastMessage: m.content,
          time: m.created_at
        });
      }
    });
    return Array.from(chatsMap.values());
  },

  subscribeToMessages(shopId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`chat-${shopId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `shop_id=eq.${shopId}` }, 
      (payload) => callback(payload.new))
      .subscribe();
  },

  // --- Real-time Notifications ---
  subscribeToNotifications(shopId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`notifs-${shopId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `shop_id=eq.${shopId}` },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },

  async getNotifications(shopId: string) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async markNotificationsRead(shopId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('shop_id', shopId);
    if (error) throw error;
    return true;
  },

  // --- Shops & Design Persistence ---
  async getShops(filterStatus: string = 'approved') {
    try {
      let query = supabase.from('shops').select('*');
      if (filterStatus) query = query.eq('status', filterStatus);
      const { data, error } = await query;
      
      if (error || !data || data.length === 0) {
        return MOCK_SHOPS.map(s => ({
          ...s, 
          logo_url: s.logoUrl, 
          status: 'approved',
          pageDesign: s.pageDesign || { primaryColor: '#00E5FF', layout: 'modern', bannerUrl: '', headerType: 'centered' }
        }));
      }
      return data.map(d => ({...d, pageDesign: d.page_design || d.pageDesign}));
    } catch {
      return MOCK_SHOPS.map(s => ({...s, logo_url: s.logoUrl, status: 'approved'}));
    }
  },

  async updateShopDesign(id: string, designConfig: any) {
    const { error } = await supabase
      .from('shops')
      .update({ page_design: designConfig })
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async getPendingShops() {
    return this.getShops('pending');
  },

  async getAllUsers() {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data || [];
  },

  async deleteUser(id: string) {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async updateUserRole(id: string, role: string) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) throw error;
    return true;
  },

  async getShopBySlug(slug: string) {
    if (!slug) return null;
    const cleanSlug = slug.toLowerCase().trim();
    
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .or(`slug.ilike.${cleanSlug},id.eq.${cleanSlug}`)
        .single();
      
      if (error || !data) {
        const mock = MOCK_SHOPS.find(s => s.slug.toLowerCase() === cleanSlug || s.id.toLowerCase() === cleanSlug);
        return mock ? {
          ...mock, 
          logo_url: mock.logoUrl,
          pageDesign: mock.pageDesign || { primaryColor: '#00E5FF', layout: 'modern', bannerUrl: '', headerType: 'centered' }
        } : null;
      }
      return {...data, pageDesign: data.page_design || data.pageDesign};
    } catch {
      const mock = MOCK_SHOPS.find(s => s.slug.toLowerCase() === cleanSlug || s.id.toLowerCase() === cleanSlug);
      return mock ? {...mock, logo_url: mock.logoUrl} : null;
    }
  },

  async updateShopStatus(id: string, status: string) {
    const { error } = await supabase
      .from('shops')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async followShop(shopId: string) {
    const { data: shop } = await supabase
      .from('shops')
      .select('followers')
      .eq('id', shopId)
      .single();
    
    const { error } = await supabase
      .from('shops')
      .update({ followers: (shop?.followers || 0) + 1 })
      .eq('id', shopId);
    
    if (error) throw error;
    return true;
  },

  async incrementVisitors(shopId: string) {
    const { data: shop } = await supabase
      .from('shops')
      .select('visitors')
      .eq('id', shopId)
      .single();
    
    if (shop) {
      await supabase
        .from('shops')
        .update({ visitors: (shop.visitors || 0) + 1 })
        .eq('id', shopId);
    }
  },

  // --- Offers Section ---
  async getOffers() {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*, shops!inner(name, logo_url, category)')
        .order('created_at', { ascending: false });
      
      if (error || !data || data.length === 0) return [];

      return data.map(o => ({
        id: o.id,
        shopId: o.shop_id,
        productId: o.product_id,
        title: o.title,
        description: o.description,
        discount: o.discount,
        oldPrice: o.old_price,
        newPrice: o.new_price,
        imageUrl: o.image_url,
        expiresIn: o.expires_at,
        shopName: o.shops?.name,
        shopLogo: o.shops?.logo_url,
        category: o.shops?.category
      }));
    } catch {
      return [];
    }
  },

  async createOffer(offerData: any) {
    const { error } = await supabase.from('offers').insert({
      product_id: offerData.productId,
      shop_id: offerData.shopId,
      title: offerData.title,
      description: offerData.description,
      discount: offerData.discount,
      old_price: offerData.oldPrice,
      new_price: offerData.newPrice,
      image_url: offerData.imageUrl,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    if (error) throw error;
    return true;
  },

  async deleteOffer(offerId: string) {
    const { error } = await supabase.from('offers').delete().eq('id', offerId);
    if (error) throw error;
    return true;
  },

  async getOfferByProductId(productId: string) {
    const { data } = await supabase
      .from('offers')
      .select('*')
      .eq('product_id', productId)
      .single();
    if (!data) return null;
    return {
      ...data,
      shopId: data.shop_id,
      productId: data.product_id,
      oldPrice: data.old_price,
      newPrice: data.new_price,
      imageUrl: data.image_url
    };
  },

  async getProducts(shopId?: string) {
    try {
      let query = supabase.from('products').select('*');
      if (shopId) query = query.eq('shop_id', shopId);
      const { data, error } = await query;
      return data || [];
    } catch {
      return [];
    }
  },

  async getProductById(id: string) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  },

  async addProduct(product: any) {
    const { error } = await supabase.from('products').insert({
      shop_id: product.shopId,
      name: product.name,
      price: product.price,
      stock: product.stock,
      image_url: product.imageUrl,
      category: product.category || 'عام'
    });
    if (error) throw error;
    return true;
  },

  async updateProductStock(id: string, stock: number) {
    const { error } = await supabase
      .from('products')
      .update({ stock })
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async deleteProduct(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // --- Orders & Reservations ---
  async placeOrder(order: any) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('orders').insert({ 
      user_id: user?.id, 
      shop_id: order.items[0]?.shopId,
      total: order.total,
      items: order.items,
      status: 'pending',
      created_at: new Date().toISOString() 
    });
    
    if (error) throw error;
    return true;
  },

  async getAllOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  },

  async addReservation(res: any) {
    const { error } = await supabase.from('reservations').insert({
      item_id: res.itemId,
      item_name: res.itemName,
      item_image: res.itemImage,
      item_price: res.itemPrice,
      shop_id: res.shopId,
      shop_name: res.shopName,
      customer_name: res.customerName,
      customer_phone: res.customerPhone,
      status: 'pending',
      created_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  },

  async getReservations() {
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  },

  async updateReservationStatus(id: string, status: string) {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async addSale(sale: any) {
    const { error } = await supabase.from('orders').insert({
      shop_id: sale.shopId || 's1',
      total: sale.total,
      items: sale.items,
      status: 'completed',
      created_at: new Date(sale.createdAt).toISOString()
    });
    if (error) throw error;
    return true;
  },

  // --- Feedback ---
  async saveFeedback(feedback: any) {
    const { error } = await supabase.from('feedback').insert({
      content: feedback.text,
      user_name: feedback.userName,
      user_email: feedback.userEmail,
      created_at: new Date().toISOString()
    });
    if (error) throw error;
    return true;
  },

  async getFeedback() {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  },

  // --- Analytics ---
  async getShopAnalytics(shopId: string) {
    const { data: orders } = await supabase.from('orders').select('total, created_at').eq('shop_id', shopId);
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders?.filter(o => o.created_at.startsWith(today)) || [];
    
    return {
      revenueToday: todayOrders.reduce((sum, o) => sum + o.total, 0),
      totalRevenue: orders?.reduce((sum, o) => sum + o.total, 0) || 0,
      salesCountToday: todayOrders.length,
      totalOrders: orders?.length || 0,
      chartData: [
        { name: 'السبت', sales: 400 },
        { name: 'الأحد', sales: 300 },
        { name: 'الاثنين', sales: 600 },
        { name: 'الثلاثاء', sales: 800 },
        { name: 'الأربعاء', sales: 500 },
        { name: 'الخميس', sales: 900 },
        { name: 'الجمعة', sales: 1200 },
      ]
    };
  },

  async getSystemAnalytics() {
    const { data: shops } = await supabase.from('shops').select('id');
    const { data: users } = await supabase.from('profiles').select('id');
    const { data: orders } = await supabase.from('orders').select('total');
    
    return {
      totalRevenue: orders?.reduce((sum, o) => sum + o.total, 0) || 0,
      totalUsers: users?.length || 0,
      totalShops: shops?.length || 0,
      totalOrders: orders?.length || 0
    };
  }
};
