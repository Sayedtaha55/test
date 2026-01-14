
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
