
export enum Category {
  RETAIL = 'RETAIL',
  RESTAURANT = 'RESTAURANT',
  SERVICE = 'SERVICE'
}

export interface ShopDesign {
  primaryColor: string;
  layout: 'minimal' | 'modern' | 'bold';
  bannerUrl: string;
  headerType: 'centered' | 'side';
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  category: Category;
  governorate: string;
  city: string;
  logoUrl: string;
  rating: number;
  pageDesign: ShopDesign;
  followers: number; 
  visitors: number;
  status: 'approved' | 'pending' | 'rejected';
  // تفاصيل إضافية للتواصل والمواعيد
  phone?: string;
  openingHours?: string;
  addressDetailed?: string;
}

export interface Offer {
  id: string;
  shopId: string;
  productId: string;
  shopName: string;
  shopLogo: string;
  title: string;
  description: string;
  discount: number;
  oldPrice: number;
  newPrice: number;
  imageUrl: string;
  category: Category;
  expiresIn: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
}

export interface Reservation {
  id: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  itemPrice: number;
  shopId: string;
  shopName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: number;
}

export interface ShopGallery {
  id: string;
  shopId: string;
  imageUrl: string;
  thumbUrl?: string;
  mediumUrl?: string;
  caption?: string;
  createdAt: number;
}
