
import { Category, Shop, Offer, Product, Reservation } from './types';
import { ApiService } from './services/api.service';

export const MOCK_SHOPS: Shop[] = [
  
];

export const RayDB = {
  getShops: async () => ApiService.getShops(),
  getOffers: async () => ApiService.getOffers(),
  getProducts: async (shopId?: string) => ApiService.getProducts(shopId),
  getShopBySlug: async (slug: string) => ApiService.getShopBySlug(slug),
  addProduct: async (product: any) => ApiService.addProduct(product),
  getAnalytics: async (shopId: string) => ApiService.getShopAnalytics(shopId),
  getFavorites: () => JSON.parse(localStorage.getItem('ray_favorites') || '[]'),
  getCart: () => {
    try {
      const raw = localStorage.getItem('ray_cart');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  setCart: (items: any[]) => {
    const safe = Array.isArray(items) ? items : [];
    localStorage.setItem('ray_cart', JSON.stringify(safe));
    window.dispatchEvent(new Event('cart-updated'));
    return safe;
  },
  addToCart: (input: any) => {
    if (!input) return RayDB.getCart();
    const productId = String(input?.productId || input?.id || '').trim();
    const shopId = String(input?.shopId || '').trim();
    if (!productId) return RayDB.getCart();
    const lineId = String(input?.lineId || `${shopId || 'unknown'}:${productId}`);

    const nextItem = {
      ...input,
      id: productId,
      shopId,
      lineId,
      quantity: Math.max(1, Number(input?.quantity) || 1),
      price: Number(input?.price) || 0,
      name: String(input?.name || ''),
      shopName: String(input?.shopName || input?.shop_name || ''),
    };

    const prev = RayDB.getCart();
    const existing = prev.find((i: any) => String(i?.lineId || `${i?.shopId || 'unknown'}:${i?.id}`) === lineId);
    const merged = existing
      ? prev.map((i: any) => {
          const key = String(i?.lineId || `${i?.shopId || 'unknown'}:${i?.id}`);
          if (key !== lineId) return i;
          const prevQty = Number(i?.quantity) || 0;
          return { ...i, ...nextItem, quantity: prevQty + (Number(nextItem.quantity) || 1) };
        })
      : [...prev, nextItem];

    return RayDB.setCart(merged);
  },
  removeFromCart: (lineId: string) => {
    const key = String(lineId || '').trim();
    if (!key) return RayDB.getCart();
    const prev = RayDB.getCart();
    const filtered = prev.filter((i: any) => String(i?.lineId || `${i?.shopId || 'unknown'}:${i?.id}`) !== key);
    return RayDB.setCart(filtered);
  },
  updateCartItemQuantity: (lineId: string, delta: number) => {
    const key = String(lineId || '').trim();
    if (!key) return RayDB.getCart();
    const d = Number(delta) || 0;
    if (d === 0) return RayDB.getCart();
    const prev = RayDB.getCart();
    const next = prev
      .map((i: any) => {
        const itemKey = String(i?.lineId || `${i?.shopId || 'unknown'}:${i?.id}`);
        if (itemKey !== key) return i;
        const nextQty = Math.max(0, (Number(i?.quantity) || 0) + d);
        return { ...i, quantity: nextQty };
      })
      .filter((i: any) => (Number(i?.quantity) || 0) > 0);
    return RayDB.setCart(next);
  },
  clearCart: () => {
    return RayDB.setCart([]);
  },
  toggleFavorite: (id: string) => {
    const favs = JSON.parse(localStorage.getItem('ray_favorites') || '[]');
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id); else favs.splice(idx, 1);
    localStorage.setItem('ray_favorites', JSON.stringify(favs));
    window.dispatchEvent(new Event('ray-db-update'));
    return idx === -1;
  },
  followShop: async (shopId: string) => ApiService.followShop(shopId),
  updateProductStock: async (id: string, stock: number) => ApiService.updateProductStock(id, stock),
  addSale: async (sale: any) => ApiService.addSale(sale),
  getReservations: async () => ApiService.getReservations(),
  addReservation: async (res: Reservation) => ApiService.addReservation(res),
  getProductById: async (id: string) => ApiService.getProductById(id),
  getOfferByProductId: async (productId: string) => ApiService.getOfferByProductId(productId),
  incrementVisitors: async (shopId: string) => {
     await ApiService.incrementVisitors(shopId);
  }
};
