import { Shop, Product, Offer, Reservation, Category, ShopGallery } from '../types';

// Mock implementation since we removed Supabase
class MockDatabase {
  private shops: any[] = [];
  private messages: any[] = [];
  private knownMessageIds: Set<string> = new Set();
  private messageSubscribers: Record<string, Set<(payload: any) => void>> = {};
  private notifications: any[] = [];
  private offers: any[] = [];
  private products: any[] = [];
  private users: any[] = [];
  private reservations: any[] = [];
  private orders: any[] = [];
  private shopGallery: any[] = [];
  private themes: any[] = [];
  private analytics: any = {
    totalRevenue: 125000,
    totalOrders: 850,
    totalCustomers: 1200,
    revenueGrowth: 12.5,
    orderGrowth: 8.3,
    customerGrowth: 15.2
  };
  private shopAnalytics: Record<string, any> = {};

  constructor() {
    this.loadMessagesFromStorage();
  }

  private normalizeStoredMessage(msg: any) {
    const shopIdRaw = msg?.shopId ?? msg?.shop_id;
    const role = msg?.role;
    const sender_id = msg?.sender_id ?? msg?.senderId;
    const sender_name = msg?.sender_name ?? msg?.senderName;
    const content = msg?.content ?? msg?.text ?? '';
    const created_at = msg?.created_at ?? msg?.createdAt ?? new Date().toISOString();
    const userId = msg?.userId ?? msg?.user_id ?? (role === 'customer' ? sender_id : undefined);

    const shopId = shopIdRaw != null ? String(shopIdRaw) : '';
    const normalizedSenderId = sender_id != null ? String(sender_id) : '';
    const normalizedUserId = userId != null ? String(userId) : undefined;

    if (!shopId || !normalizedSenderId || !role) return null;

    return {
      id: String(msg?.id ?? Date.now().toString()),
      shopId,
      userId: normalizedUserId,
      sender_id: normalizedSenderId,
      sender_name,
      role,
      content,
      created_at,
    };
  }

  private loadMessagesFromStorage() {
    try {
      const raw = localStorage.getItem('ray_mock_messages');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.messages = parsed
          .map((m: any) => this.normalizeStoredMessage(m))
          .filter(Boolean);
        this.knownMessageIds = new Set(this.messages.map((m: any) => String(m.id)));
        this.saveMessagesToStorage();
      }
    } catch {
      // ignore
    }
  }

  private saveMessagesToStorage() {
    try {
      localStorage.setItem('ray_mock_messages', JSON.stringify(this.messages));
    } catch {
      // ignore
    }
  }

  // Auth methods
  async login(email: string, pass: string) {
    // Mock login - in real app, use JWT
    if ((email === 'admin' && pass === '1234') || (email === 'admin@ray.com' && pass === 'admin123')) {
      return {
        user: { id: 'admin', email: email, name: 'Admin', role: 'admin' },
        session: { access_token: 'mock_token' }
      };
    }
    throw new Error('Invalid credentials');
  }

  private slugify(value: string) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private ensureUniqueSlug(base: string) {
    const baseSlug = this.slugify(base) || `shop-${Date.now()}`;
    let slug = baseSlug;
    let i = 1;
    while (this.shops.some((s: any) => s.slug === slug)) {
      i += 1;
      slug = `${baseSlug}-${i}`;
    }
    return slug;
  }

  async signup(data: any) {
    const userId = Date.now().toString();
    const shopId = data.role === 'merchant' ? `${Date.now().toString()}_shop` : null;

    const user = {
      id: userId,
      email: data.email,
      name: data.name,
      role: data.role,
      shopId
    };

    if (data.role === 'merchant') {
      if (!data.shopName || !data.category || !data.governorate || !data.city) {
        throw new Error('بيانات المحل غير مكتملة');
      }

      const slug = this.ensureUniqueSlug(data.shopName || data.name || `shop-${userId}`);
      const shop: any = {
        id: shopId,
        name: data.shopName,
        slug,
        category: data.category,
        governorate: data.governorate,
        city: data.city,
        email: data.shopEmail || data.email,
        logoUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=200',
        rating: 0,
        followers: 0,
        visitors: 0,
        status: 'pending',
        phone: data.shopPhone || data.phone,
        openingHours: data.openingHours || '',
        addressDetailed: data.addressDetailed || '',
        description: data.shopDescription || '',
        ownerId: userId,
        pageDesign: {
          primaryColor: '#00E5FF',
          layout: 'modern',
          bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
          headerType: 'centered'
        }
      };

      this.shops.push(shop);
    }

    this.users.push(user);
    
    return {
      user,
      session: { access_token: 'mock_token' }
    };
  }

  // Chat methods
  async sendMessage(msg: any) {
    const shopId = msg?.shopId ?? msg?.shop_id;
    const role = msg?.role;
    const sender_id = msg?.sender_id ?? msg?.senderId;
    const sender_name = msg?.sender_name ?? msg?.senderName;
    const content = msg?.content ?? msg?.text ?? '';

    const userId = (() => {
      if (msg?.userId) return msg.userId;
      if (role === 'customer') return sender_id;
      return undefined;
    })();

    const message = {
      id: Date.now().toString(),
      shopId: shopId != null ? String(shopId) : shopId,
      userId: userId != null ? String(userId) : userId,
      sender_id: sender_id != null ? String(sender_id) : sender_id,
      sender_name,
      role,
      content,
      created_at: new Date().toISOString(),
    };

    this.messages.push(message);
    this.knownMessageIds.add(String(message.id));
    this.saveMessagesToStorage();

    if (shopId && this.messageSubscribers[shopId]) {
      for (const cb of this.messageSubscribers[shopId]) {
        try {
          cb(message);
        } catch {
          // ignore
        }
      }
    }

    return { error: null };
  }

  async getMessages(shopId: string, userId: string) {
    const sid = String(shopId);
    const uid = String(userId);
    return this.messages.filter(m => String(m.shopId ?? m.shop_id) === sid && String(m.userId ?? m.user_id) === uid);
  }

  async getMerchantChats(shopId: string) {
    const sid = String(shopId);
    const shopMessages = this.messages
      .map((m: any) => this.normalizeStoredMessage(m) || null)
      .filter(Boolean)
      .filter((m: any) => String(m.shopId) === sid && m.userId);
    const byUserId: Record<string, any[]> = {};
    for (const m of shopMessages) {
      const uid = String(m.userId);
      if (!byUserId[uid]) byUserId[uid] = [];
      byUserId[uid].push(m);
    }

    const chats = Object.entries(byUserId).map(([userId, msgs]) => {
      const sorted = msgs.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const last = sorted[sorted.length - 1];
      const customerMsg = sorted.find(m => m.role === 'customer');
      return {
        userId,
        userName: customerMsg?.sender_name || 'عميل',
        lastMessage: last?.content || '',
        lastMessageAt: last?.created_at,
      };
    });

    return chats.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
  }

  subscribeToMessages(shopId: string, callback: (payload: any) => void) {
    if (!this.messageSubscribers[shopId]) {
      this.messageSubscribers[shopId] = new Set();
    }
    this.messageSubscribers[shopId].add(callback);

    const onStorage = (e: StorageEvent) => {
      try {
        if (e.key !== 'ray_mock_messages' || !e.newValue) return;
        const parsed = JSON.parse(e.newValue);
        if (!Array.isArray(parsed)) return;
        const normalized = parsed
          .map((m: any) => this.normalizeStoredMessage(m))
          .filter(Boolean);

        for (const m of normalized) {
          const id = String(m.id);
          if (this.knownMessageIds.has(id)) continue;
          this.knownMessageIds.add(id);
          this.messages.push(m);
          if (m.shopId === shopId) {
            try {
              callback(m);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', onStorage);
    }

    return {
      unsubscribe: () => {
        this.messageSubscribers[shopId]?.delete(callback);
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', onStorage);
        }
      }
    };
  }

  // Notification methods
  subscribeToNotifications(shopId: string, callback: (payload: any) => void) {
    // Mock subscription
    return {
      unsubscribe: () => {}
    };
  }

  async getNotifications(shopId: string) {
    return this.notifications.filter(n => n.shop_id === shopId);
  }

  async markNotificationsRead(shopId: string) {
    this.notifications = this.notifications.map(n => 
      n.shop_id === shopId ? { ...n, is_read: true } : n
    );
    return { error: null };
  }

  // Shop methods
  async getShops(filterStatus: 'approved' | 'pending' | 'rejected' | 'all' | '' = 'approved') {
    if (!filterStatus || filterStatus === 'all') {
      return this.shops;
    }
    return this.shops.filter((s: any) => (s.status ?? 'approved') === filterStatus);
  }

  async updateShopDesign(id: string, designConfig: any) {
    const shopIndex = this.shops.findIndex(s => s.id === id);
    if (shopIndex !== -1) {
      this.shops[shopIndex].pageDesign = designConfig;
    }
    return { error: null };
  }

  async getShopBySlugOrId(slugOrId: string) {
    return this.shops.find(s => s.slug === slugOrId || s.id === slugOrId);
  }

  async getShopBySlug(slug: string) {
    return this.getShopBySlugOrId(slug);
  }

  async updateShopStatus(id: string, status: 'approved' | 'pending' | 'rejected') {
    const shopIndex = this.shops.findIndex(s => s.id === id);
    if (shopIndex !== -1) {
      this.shops[shopIndex].status = status;
    }
    return { error: null };
  }

  async followShop(shopId: string) {
    const shopIndex = this.shops.findIndex(s => s.id === shopId);
    if (shopIndex !== -1) {
      this.shops[shopIndex].followers = (this.shops[shopIndex].followers || 0) + 1;
    }
    return { error: null };
  }

  async incrementVisitors(shopId: string) {
    const shopIndex = this.shops.findIndex(s => s.id === shopId);
    if (shopIndex !== -1) {
      this.shops[shopIndex].visitors = (this.shops[shopIndex].visitors || 0) + 1;
    }
    return { error: null };
  }

  // Offer methods
  async getOffers() {
    return this.offers;
  }

  async createOffer(offerData: any) {
    const offer = {
      ...offerData,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    this.offers.push(offer);
    return { error: null };
  }

  async deleteOffer(offerId: string) {
    this.offers = this.offers.filter(o => o.id !== offerId);
    return { error: null };
  }

  async getOfferByProductId(productId: string) {
    return this.offers.find(o => o.product_id === productId);
  }

  // Product methods
  async getProducts(shopId?: string) {
    if (shopId) {
      return this.products.filter(p => p.shop_id === shopId);
    }
    return this.products;
  }

  async getProductById(id: string) {
    return this.products.find(p => p.id === id);
  }

  async addProduct(product: any) {
    const newProduct = {
      ...product,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    this.products.push(newProduct);
    return { error: null };
  }

  async updateProductStock(id: string, stock: number) {
    const productIndex = this.products.findIndex(p => p.id === id);
    if (productIndex !== -1) {
      this.products[productIndex].stock = stock;
    }
    return { error: null };
  }

  async deleteProduct(id: string) {
    this.products = this.products.filter(p => p.id !== id);
    return { error: null };
  }

  // Reservation methods
  async getReservations() {
    return this.reservations;
  }

  async addReservation(reservation: any) {
    const r = {
      ...reservation,
      id: reservation.id || Date.now().toString(),
      created_at: reservation.created_at || new Date().toISOString(),
      status: reservation.status || 'pending'
    };
    this.reservations.push(r);
    return { error: null };
  }

  async updateReservationStatus(id: string, status: string) {
    const idx = this.reservations.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.reservations[idx] = { ...this.reservations[idx], status };
    }
    return { error: null };
  }

  // Orders / Sales methods
  async getAllOrders() {
    return this.orders;
  }

  async addSale(sale: any) {
    const o = {
      ...sale,
      id: sale.id || Date.now().toString(),
      created_at: sale.created_at || new Date().toISOString(),
      total: sale.total ?? 0,
      shop_id: sale.shop_id ?? sale.shopId,
      items: sale.items ?? []
    };
    this.orders.push(o);
    return { error: null };
  }

  // Shop analytics / gallery
  async getShopAnalytics(shopId: string) {
    if (!this.shopAnalytics[shopId]) {
      this.shopAnalytics[shopId] = {
        shop_id: shopId,
        revenue: 0,
        ordersCount: 0,
        visitorsCount: 0,
        followersCount: 0
      };
    }
    return this.shopAnalytics[shopId];
  }

  async getShopGallery(shopId: string) {
    return this.shopGallery.filter((img) => img.shop_id === shopId || img.shopId === shopId);
  }

  async addShopGalleryImage(shopId: string, image: any) {
    const entry = {
      ...image,
      id: image.id || Date.now().toString(),
      shop_id: shopId,
      created_at: image.created_at || new Date().toISOString()
    };
    this.shopGallery.push(entry);
    return { error: null };
  }

  async deleteShopGalleryImage(id: string) {
    this.shopGallery = this.shopGallery.filter((img) => img.id !== id);
    return { error: null };
  }

  // User management
  async getAllUsers() {
    return this.users;
  }

  // Customer management
  private customers: any[] = [];

  async getShopCustomers(shopId: string) {
    return this.customers.filter(c => c.shopId === shopId);
  }

  async convertReservationToCustomer(customerData: any) {
    // Check if customer already exists
    const existingCustomer = this.customers.find(c => 
      c.shopId === customerData.shopId && 
      (c.phone === customerData.customerPhone || c.email === customerData.customerEmail)
    );

    if (existingCustomer) {
      // Update existing customer
      existingCustomer.orders += 1;
      existingCustomer.totalSpent += customerData.firstPurchaseAmount || 0;
      existingCustomer.lastPurchaseDate = new Date().toISOString();
      existingCustomer.lastPurchaseItem = customerData.firstPurchaseItem;
      return existingCustomer;
    } else {
      // Create new customer
      const customer = {
        id: Date.now().toString(),
        name: customerData.customerName,
        phone: customerData.customerPhone,
        email: customerData.customerEmail,
        shopId: customerData.shopId,
        convertedFromReservation: true,
        createdAt: new Date().toISOString(),
        lastPurchaseDate: new Date().toISOString(),
        firstPurchaseItem: customerData.firstPurchaseItem,
        orders: 1,
        totalSpent: customerData.firstPurchaseAmount || 0,
        status: 'active'
      };
      this.customers.push(customer);
      return customer;
    }
  }

  async updateCustomerStatus(customerId: string, status: string) {
    const customer = this.customers.find(c => c.id === customerId);
    if (customer) {
      customer.status = status;
      return customer;
    }
    throw new Error('Customer not found');
  }

  async deleteUser(id: string) {
    this.users = this.users.filter(u => u.id !== id);
    return true;
  }

  async updateUserRole(id: string, role: string) {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      this.users[userIndex].role = role;
    }
    return { error: null };
  }

  // Analytics methods
  async getSystemAnalytics() {
    return this.analytics;
  }

  async getPendingShops() {
    return this.shops.filter(s => s.status === 'pending');
  }

  // Theme methods
  async getThemeTemplates() {
    // Return default themes if no themes in database
    if (this.themes.length === 0) {
      return [
        {
          id: '1',
          name: 'modern',
          displayName: 'عصري',
          description: 'تصميم عصري بألوان زاهية وخطوط واضحة',
          category: 'modern',
          primary: '#00E5FF',
          secondary: '#BD00FF',
          accent: '#000000',
          background: '#FFFFFF',
          text: '#000000',
          fontFamily: 'Inter',
          borderRadius: '1rem'
        },
        {
          id: '2',
          name: 'classic',
          displayName: 'كلاسيكي',
          description: 'تصميم كلاسيكي بألوان هادئة وأنيقة',
          category: 'classic',
          primary: '#2C3E50',
          secondary: '#E74C3C',
          accent: '#34495E',
          background: '#FFFFFF',
          text: '#2C3E50',
          fontFamily: 'Georgia',
          borderRadius: '0.5rem'
        },
        {
          id: '3',
          name: 'minimal',
          displayName: 'بسيط',
          description: 'تصميم بسيط ونظيف بألوان محايدة',
          category: 'minimal',
          primary: '#333333',
          secondary: '#666666',
          accent: '#000000',
          background: '#FFFFFF',
          text: '#333333',
          fontFamily: 'Arial',
          borderRadius: '0.25rem'
        }
      ];
    }
    return this.themes;
  }

  async createTheme(themeData: any) {
    const theme = {
      ...themeData,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    this.themes.push(theme);
    return { error: null };
  }

  async updateTheme(id: string, themeData: any) {
    const themeIndex = this.themes.findIndex(t => t.id === id);
    if (themeIndex !== -1) {
      this.themes[themeIndex] = { ...this.themes[themeIndex], ...themeData };
    }
    return { error: null };
  }

  async deleteTheme(id: string) {
    this.themes = this.themes.filter(t => t.id !== id);
    return { error: null };
  }

  // Feedback
  async getFeedback() {
    // Return mock feedback data
    return [
      {
        id: '1',
        userId: 'user1',
        userName: 'أحمد محمد',
        userEmail: 'ahmed@example.com',
        rating: 5,
        comment: 'خدمة ممتازة ومنتجات رائعة!',
        createdAt: new Date().toISOString(),
        status: 'published'
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'فاطمة علي',
        userEmail: 'fatima@example.com',
        rating: 4,
        comment: 'جيد جدا ولكن يمكن تحسين سرعة التوصيل',
        createdAt: new Date().toISOString(),
        status: 'published'
      }
    ];
  }
}

const mockDb = new MockDatabase();

const BACKEND_BASE_URL = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || 'http://localhost:4000';

function toBackendUrl(url: string) {
  if (!url) return url;
  return url.startsWith('/') ? `${BACKEND_BASE_URL}${url}` : url;
}

async function backendPost<T>(path: string, body: any): Promise<T> {
  const token = getAuthToken();
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isFormData ? body : JSON.stringify(body),
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

async function backendDelete<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

function getAuthToken() {
  try {
    return localStorage.getItem('ray_token') || '';
  } catch {
    return '';
  }
}

async function backendGet<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

async function backendPatch<T>(path: string, body: any): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

async function backendPut<T>(path: string, body: any): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BACKEND_BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

function normalizeUserFromBackend(user: any) {
  return {
    ...user,
    role: String(user?.role || '').toLowerCase(),
  };
}

function normalizeShopFromBackend(shop: any) {
  if (!shop) return shop;
  const logoUrl = shop.logoUrl ?? shop.logo_url;
  const bannerUrl = shop.bannerUrl ?? shop.banner_url;
  const status = String(shop.status || '').toLowerCase();
  return {
    ...shop,
    status,
    logoUrl,
    bannerUrl,
    // legacy snake_case for current UI
    logo_url: shop.logo_url ?? logoUrl,
    banner_url: shop.banner_url ?? bannerUrl,
    pageDesign: shop.pageDesign || shop.page_design || shop.pageDesign || null,
  };
}

function normalizeProductFromBackend(product: any) {
  if (!product) return product;
  const imageUrl = product.imageUrl ?? product.image_url ?? product.image ?? '';
  const shopId = product.shopId ?? product.shop_id;
  return {
    ...product,
    imageUrl,
    image_url: product.image_url ?? imageUrl,
    shopId,
    shop_id: product.shop_id ?? shopId,
    stock: typeof product.stock === 'number' ? product.stock : Number(product.stock || 0),
    price: typeof product.price === 'number' ? product.price : Number(product.price || 0),
  };
}

function normalizeOrderFromBackend(order: any) {
  if (!order) return order;
  const createdAt = order.createdAt ?? order.created_at;
  const shopId = order.shopId ?? order.shop_id;
  return {
    ...order,
    createdAt,
    created_at: order.created_at ?? createdAt,
    shopId,
    shop_id: order.shop_id ?? shopId,
    total: typeof order.total === 'number' ? order.total : Number(order.total || 0),
  };
}

function getLocalShopIdFromStorage(): string | undefined {
  try {
    const raw = localStorage.getItem('ray_user');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed?.shopId) return String(parsed.shopId);
    if (parsed?.shop_id) return String(parsed.shop_id);
    return undefined;
  } catch {
    return undefined;
  }
}

function getLocalUserRoleFromStorage(): string | undefined {
  try {
    const raw = localStorage.getItem('ray_user');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed?.role) return String(parsed.role);
    return undefined;
  } catch {
    return undefined;
  }
}

async function loginViaBackend(email: string, pass: string) {
  const data = await backendPost<{ access_token: string; user: any }>(
    '/api/v1/auth/login',
    { email, password: pass },
  );
  return {
    user: normalizeUserFromBackend(data.user),
    session: { access_token: data.access_token },
  };
}

async function signupViaBackend(payload: any) {
  const data = await backendPost<{ access_token: string; user: any }>(
    '/api/v1/auth/signup',
    payload,
  );
  return {
    user: normalizeUserFromBackend(data.user),
    session: { access_token: data.access_token },
  };
}

export const ApiService = {
  // Auth
  login: async (email: string, pass: string) => {
    return await loginViaBackend(email, pass);
  },
  signup: async (data: any) => {
    return await signupViaBackend(data);
  },

  // Chat
  sendMessage: mockDb.sendMessage.bind(mockDb),
  getMessages: mockDb.getMessages.bind(mockDb),
  getMerchantChats: mockDb.getMerchantChats.bind(mockDb),
  subscribeToMessages: mockDb.subscribeToMessages.bind(mockDb),

  // Notifications
  subscribeToNotifications: mockDb.subscribeToNotifications.bind(mockDb),
  getNotifications: mockDb.getNotifications.bind(mockDb),
  markNotificationsRead: mockDb.markNotificationsRead.bind(mockDb),

  // Shops
  getShops: async (filterStatus: 'approved' | 'pending' | 'rejected' | 'all' | '' = 'approved') => {
    const status = String(filterStatus || 'approved').toLowerCase();
    // Public shops list (approved only)
    if (!status || status === 'approved') {
      const shops = await backendGet<any[]>('/api/v1/shops');
      return shops.map(normalizeShopFromBackend);
    }

    // Admin list (requires token)
    if (status === 'all') {
      const shops = await backendGet<any[]>('/api/v1/shops/admin/list?status=ALL');
      return shops.map(normalizeShopFromBackend);
    }
    if (status === 'pending') {
      const shops = await backendGet<any[]>('/api/v1/shops/admin/list?status=PENDING');
      return shops.map(normalizeShopFromBackend);
    }
    if (status === 'rejected') {
      const shops = await backendGet<any[]>('/api/v1/shops/admin/list?status=REJECTED');
      return shops.map(normalizeShopFromBackend);
    }

    const shops = await backendGet<any[]>('/api/v1/shops');
    return shops.map(normalizeShopFromBackend);
  },
  updateShopDesign: async (id: string, designConfig: any) => {
    return await backendPatch<any>(`/api/v1/shops/${encodeURIComponent(id)}/design`, designConfig);
  },
  getShopBySlugOrId: async (slugOrId: string) => {
    const shop = await backendGet<any>(`/api/v1/shops/${encodeURIComponent(slugOrId)}`);
    return normalizeShopFromBackend(shop);
  },
  getShopBySlug: async (slug: string) => {
    const shop = await backendGet<any>(`/api/v1/shops/${encodeURIComponent(slug)}`);
    return normalizeShopFromBackend(shop);
  },
  getMyShop: async () => {
    const shop = await backendGet<any>('/api/v1/shops/me');
    return normalizeShopFromBackend(shop);
  },
  updateMyShop: async (payload: any) => {
    const shop = await backendPatch<any>('/api/v1/shops/me', payload);
    return normalizeShopFromBackend(shop);
  },
  getShopAdminById: async (id: string) => {
    const shop = await backendGet<any>(`/api/v1/shops/admin/${encodeURIComponent(id)}`);
    return normalizeShopFromBackend(shop);
  },
  updateShopStatus: async (id: string, status: 'approved' | 'pending' | 'rejected') => {
    const mapped = String(status || '').toUpperCase();
    const updated = await backendPatch<any>(`/api/v1/shops/admin/${encodeURIComponent(id)}/status`, {
      status: mapped,
    });
    return normalizeShopFromBackend(updated);
  },
  followShop: mockDb.followShop.bind(mockDb),
  incrementVisitors: mockDb.incrementVisitors.bind(mockDb),

  // Offers
  getOffers: async () => {
    const offers = await backendGet<any[]>('/api/v1/offers');
    return offers || [];
  },
  createOffer: async (offer: any) => {
    const created = await backendPost<any>('/api/v1/offers', offer);
    window.dispatchEvent(new Event('ray-db-update'));
    return created;
  },
  deleteOffer: async (offerId: string) => {
    const deleted = await backendDelete<any>(`/api/v1/offers/${encodeURIComponent(offerId)}`);
    window.dispatchEvent(new Event('ray-db-update'));
    return deleted;
  },
  getOfferByProductId: async (productId: string) => {
    const offers = await backendGet<any[]>('/api/v1/offers');
    return (offers || []).find((o: any) => o.productId === productId || o.product_id === productId);
  },

  // Products
  getProducts: async (shopId?: string) => {
    if (shopId) {
      const products = await backendGet<any[]>(`/api/v1/products?shopId=${encodeURIComponent(shopId)}`);
      return products.map(normalizeProductFromBackend);
    }
    // Fetch all products when no shopId is provided
    const products = await backendGet<any[]>('/api/v1/products');
    return products.map(normalizeProductFromBackend);
  },
  getProductById: async (id: string) => {
    const product = await backendGet<any>(`/api/v1/products/${encodeURIComponent(id)}`);
    return normalizeProductFromBackend(product);
  },
  addProduct: async (product: any) => {
    const created = await backendPost<any>('/api/v1/products', product);
    return normalizeProductFromBackend(created);
  },
  updateProductStock: async (id: string, stock: number) => {
    const updated = await backendPatch<any>(`/api/v1/products/${encodeURIComponent(id)}/stock`, { stock });
    return normalizeProductFromBackend(updated);
  },
  deleteProduct: async (id: string) => {
    const deleted = await backendDelete<any>(`/api/v1/products/${encodeURIComponent(id)}`);
    return normalizeProductFromBackend(deleted);
  },

  // Reservations
  getReservations: async (shopId?: string) => {
    if (shopId) {
      return backendGet<any[]>(`/api/v1/reservations?shopId=${encodeURIComponent(shopId)}`);
    }
    return backendGet<any[]>('/api/v1/reservations/me');
  },
  addReservation: async (reservation: any) => {
    return backendPost<any>('/api/v1/reservations', {
      itemId: reservation.itemId,
      itemName: reservation.itemName,
      itemImage: reservation.itemImage,
      itemPrice: reservation.itemPrice,
      shopId: reservation.shopId,
      shopName: reservation.shopName,
      customerName: reservation.customerName,
      customerPhone: reservation.customerPhone,
    });
  },
  updateReservationStatus: async (id: string, status: string) => {
    return backendPatch<any>(`/api/v1/reservations/${encodeURIComponent(id)}/status`, { status });
  },

  // Orders / Sales
  getAllOrders: async (opts?: { shopId?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (opts?.shopId) params.set('shopId', String(opts.shopId));
    if (opts?.from) params.set('from', String(opts.from));
    if (opts?.to) params.set('to', String(opts.to));
    const qs = params.toString();

    // Admin endpoint
    const localRole = String(getLocalUserRoleFromStorage() || '').toUpperCase();
    if (localRole === 'ADMIN') {
      try {
        const data = await backendGet<any[]>(`/api/v1/orders/admin${qs ? `?${qs}` : ''}`);
        return (data || []).map(normalizeOrderFromBackend);
      } catch {
        // ignore
      }
    }

    const shopId = opts?.shopId || getLocalShopIdFromStorage();
    if (shopId) {
      const merchantParams = new URLSearchParams();
      merchantParams.set('shopId', String(shopId));
      if (opts?.from) merchantParams.set('from', String(opts.from));
      if (opts?.to) merchantParams.set('to', String(opts.to));
      const qs2 = merchantParams.toString();
      try {
        const data = await backendGet<any[]>(`/api/v1/orders${qs2 ? `?${qs2}` : ''}`);
        return (data || []).map(normalizeOrderFromBackend);
      } catch {
        // ignore
      }
    }

    return [];
  },
  addSale: mockDb.addSale.bind(mockDb),
  placeOrder: async (order: { items: any[]; total: number; paymentMethod?: string; shopId?: string }) => {
    // NOTE: backend expects a single shopId per order
    const shopId = order.shopId || order.items?.[0]?.shopId;
    return await backendPost<any>('/api/v1/orders', {
      shopId,
      items: order.items,
      total: order.total,
      paymentMethod: order.paymentMethod,
    });
  },

  // Shop analytics / gallery
  getShopAnalytics: async (shopId: string, opts?: { from?: string; to?: string }) => {
    try {
      const params = new URLSearchParams();
      if (opts?.from) params.set('from', String(opts.from));
      if (opts?.to) params.set('to', String(opts.to));
      const qs = params.toString();
      return await backendGet<any>(`/api/v1/shops/${encodeURIComponent(shopId)}/analytics${qs ? `?${qs}` : ''}`);
    } catch (e) {
      return {};
    }
  },
  getShopGallery: async (shopId: string) => {
    const images = await backendGet<any[]>(`/api/v1/gallery/${shopId}`);
    return (images || []).map((img: any) => ({
      ...img,
      imageUrl: toBackendUrl(img?.imageUrl),
      thumbUrl: toBackendUrl(img?.thumbUrl),
      mediumUrl: toBackendUrl(img?.mediumUrl),
    }));
  },
  addShopGalleryImage: async (shopId: string, image: any) => {
    const formData = new FormData();
    if (image.file) {
      formData.append('image', image.file);
      formData.append('caption', image.caption || '');
      formData.append('shopId', shopId);
      const created = await backendPost<any>(`/api/v1/gallery/upload`, formData);
      return {
        ...created,
        imageUrl: toBackendUrl(created?.imageUrl),
        thumbUrl: toBackendUrl(created?.thumbUrl),
        mediumUrl: toBackendUrl(created?.mediumUrl),
      };
    } else if (image.url) {
      // For URL-based images, create a mock entry
      return mockDb.addShopGalleryImage(shopId, image);
    }
    return { error: 'No image provided' };
  },
  deleteShopGalleryImage: async (imageId: string) => {
    return backendDelete(`/api/v1/gallery/${imageId}`);
  },

  // Users
  getAllUsers: mockDb.getAllUsers.bind(mockDb),
  deleteUser: mockDb.deleteUser.bind(mockDb),
  updateUserRole: mockDb.updateUserRole.bind(mockDb),

  // Analytics
  getSystemAnalytics: mockDb.getSystemAnalytics.bind(mockDb),
  getPendingShops: async () => {
    const shops = await backendGet<any[]>('/api/v1/shops/admin/list?status=PENDING');
    return shops.map(normalizeShopFromBackend);
  },

  // Themes
  getThemeTemplates: mockDb.getThemeTemplates.bind(mockDb),
  createTheme: mockDb.createTheme.bind(mockDb),
  updateTheme: mockDb.updateTheme.bind(mockDb),
  deleteTheme: mockDb.deleteTheme.bind(mockDb),

  // Feedback
  getFeedback: mockDb.getFeedback.bind(mockDb),
  saveFeedback: async (feedbackData: any) => {
    // Mock save feedback
    return { error: null };
  },

  // Customer Management
  getShopCustomers: async (shopId: string) => {
    try {
      const customers = await backendGet<any[]>(`/api/v1/customers/shop/${shopId}`);
      return customers.map((c: any) => ({
        ...c,
        totalSpent: c.totalSpent || 0,
        orders: c.orders || 0,
        status: c.status || 'active'
      }));
    } catch (e) {
      // Fallback to mock data
      return mockDb.getShopCustomers(shopId);
    }
  },

  convertReservationToCustomer: async (customerData: any) => {
    try {
      return await backendPost('/api/v1/customers/convert', customerData);
    } catch (e) {
      // Mock conversion
      return mockDb.convertReservationToCustomer(customerData);
    }
  },

  updateCustomerStatus: async (customerId: string, status: string) => {
    try {
      return await backendPut(`/api/v1/customers/${customerId}/status`, { status });
    } catch (e) {
      // Mock update
      return mockDb.updateCustomerStatus(customerId, status);
    }
  },

  sendCustomerPromotion: async (customerId: string, shopId: string) => {
    try {
      return await backendPost('/api/v1/customers/send-promotion', { customerId, shopId });
    } catch (e) {
      // Mock promotion send
      return { success: true, message: 'Promotion sent successfully' };
    }
  }
};
