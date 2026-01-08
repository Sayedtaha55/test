
import { Category, Shop, Offer, Product, Reservation } from './types';
import { ApiService } from './services/api.service';

export const MOCK_SHOPS: Shop[] = [
  {
    id: 's1',
    name: 'تست فاشون',
    slug: 'test-fashion',
    category: Category.RETAIL,
    governorate: 'القاهرة',
    city: 'مدينة نصر',
    logoUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=200',
    rating: 4.8,
    followers: 1250,
    visitors: 3400,
    phone: '01011122233',
    openingHours: '١٠ صباحاً - ١١ مساءً',
    addressDetailed: 'شارع عباس العقاد، بجوار كاشير تست',
    pageDesign: {
      primaryColor: '#00E5FF',
      layout: 'modern',
      bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200',
      headerType: 'centered'
    }
  },
  {
    id: 's2',
    name: 'شاورما الرايق',
    slug: 'al-raiek-shawarma',
    category: Category.RESTAURANT,
    governorate: 'الجيزة',
    city: 'الدقي',
    logoUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200',
    rating: 4.5,
    followers: 2100,
    visitors: 5600,
    phone: '01244455566',
    openingHours: '١ ظهراً - ٣ فجراً',
    addressDetailed: 'ميدان المساحة، أمام بنك تست الذكي',
    pageDesign: {
      primaryColor: '#BD00FF',
      layout: 'bold',
      bannerUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200',
      headerType: 'side'
    }
  }
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
