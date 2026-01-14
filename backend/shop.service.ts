import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { MonitoringService } from './monitoring/monitoring.service';

@Injectable()
export class ShopService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(MonitoringService) private readonly monitoring: MonitoringService
  ) {}

  async getShopById(id: string) {
    const startTime = Date.now();

    try {
      const shop = await this.prisma.shop.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findUnique', 'shops', duration, true);
      this.monitoring.trackPerformance('getShopById_database', duration);

      return shop;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findUnique', 'shops', duration, false);
      throw error;
    }

  }

  async updateShopSettings(
    shopId: string,
    input: {
      name?: string;
      description?: string | null;
      category?: string;
      governorate?: string;
      city?: string;
      addressDetailed?: string | null;
      phone?: string;
      email?: string | null;
      openingHours?: string | null;
      logoUrl?: string | null;
      bannerUrl?: string | null;
      whatsapp?: string | null;
      customDomain?: string | null;
    },
  ) {
    const startTime = Date.now();

    try {
      const current = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { id: true, slug: true, layoutConfig: true },
      });

      const prevLayout = (current?.layoutConfig as any) || {};
      const nextLayout = {
        ...prevLayout,
        ...(typeof input.whatsapp === 'undefined' ? {} : { whatsapp: input.whatsapp }),
        ...(typeof input.customDomain === 'undefined' ? {} : { customDomain: input.customDomain }),
      };

      const updated = await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          ...(typeof input.name === 'undefined' ? {} : { name: input.name }),
          ...(typeof input.description === 'undefined' ? {} : { description: input.description }),
          ...(typeof input.category === 'undefined' ? {} : { category: input.category as any }),
          ...(typeof input.governorate === 'undefined' ? {} : { governorate: input.governorate }),
          ...(typeof input.city === 'undefined' ? {} : { city: input.city }),
          ...(typeof input.addressDetailed === 'undefined' ? {} : { addressDetailed: input.addressDetailed }),
          ...(typeof input.phone === 'undefined' ? {} : { phone: input.phone }),
          ...(typeof input.email === 'undefined' ? {} : { email: input.email }),
          ...(typeof input.openingHours === 'undefined' ? {} : { openingHours: input.openingHours }),
          ...(typeof input.logoUrl === 'undefined' ? {} : { logoUrl: input.logoUrl }),
          ...(typeof input.bannerUrl === 'undefined' ? {} : { bannerUrl: input.bannerUrl }),
          layoutConfig: nextLayout as any,
        },
      });

      await this.redis.invalidateShopCache(updated.id, updated.slug);

      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('update', 'shops', duration, true);
      this.monitoring.trackPerformance('updateShopSettings_database', duration);

      return updated;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('update', 'shops', duration, false);
      throw error;
    }
  }

  async getShopsByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ALL' = 'ALL') {
    const startTime = Date.now();

    try {
      const shops = await this.prisma.shop.findMany({
        where: {
          ...(status === 'ALL' ? {} : { status: status as any }),
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findMany', 'shops', duration, true);
      this.monitoring.trackPerformance('getShopsByStatus_database', duration);

      return shops;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findMany', 'shops', duration, false);
      throw error;
    }
  }

  async updateShopStatus(shopId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    const startTime = Date.now();

    try {
      const updated = await this.prisma.shop.update({
        where: { id: shopId },
        data: { status: status as any },
      });

      await this.redis.invalidateShopCache(updated.id, updated.slug);

      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('update', 'shops', duration, true);
      this.monitoring.trackPerformance('updateShopStatus_database', duration);

      return updated;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('update', 'shops', duration, false);
      throw error;
    }
  }

  async getAllShops() {
    const startTime = Date.now();
    
    try {
      // Try to get from cache first
      const cachedShops = await this.redis.getShopsList();
      if (cachedShops) {
        const duration = Date.now() - startTime;
        this.monitoring.trackCache('getShopsList', 'shops:list', true, duration);
        this.monitoring.trackPerformance('getAllShops_cached', duration);
        return cachedShops;
      }

      // If not in cache, fetch from database
      const shops = await this.prisma.shop.findMany({
        where: { isActive: true, status: 'APPROVED' },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              products: true,
              offers: true,
            },
          },
        },
      });

      // Cache the result for 30 minutes
      await this.redis.cacheShopsList(shops, 1800);
      
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findMany', 'shops', duration, true);
      this.monitoring.trackPerformance('getAllShops_database', duration);
      
      return shops;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findMany', 'shops', duration, false);
      throw error;
    }
  }

  async getShopBySlug(slug: string) {
    const startTime = Date.now();
    
    try {
      // Try to get from cache first
      const cachedShop = await this.redis.getShopBySlug(slug);
      if (cachedShop) {
        const duration = Date.now() - startTime;
        this.monitoring.trackCache('getShopBySlug', `shop:slug:${slug}`, true, duration);
        this.monitoring.trackPerformance('getShopBySlug_cached', duration);
        
        // Increment visitors counter asynchronously
        this.incrementVisitors(cachedShop.id).catch(console.error);
        return cachedShop;
      }

      // If not in cache, fetch from database
      const shop = await this.prisma.shop.findUnique({
        where: { slug },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          products: {
            where: { isActive: true },
            take: 10,
          },
          offers: {
            where: { isActive: true },
            take: 5,
          },
          gallery: {
            where: { isActive: true },
            take: 6,
          },
        },
      });

      if (shop) {
        // Cache the shop data for 1 hour
        await this.redis.cacheShop(shop.id, shop, 3600);
        
        // Increment visitors
        await this.incrementVisitors(shop.id);
      }

      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findUnique', 'shops', duration, true);
      this.monitoring.trackPerformance('getShopBySlug_database', duration);
      
      return shop;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findUnique', 'shops', duration, false);
      throw error;
    }
  }

  async incrementVisitors(shopId: string) {
    const startTime = Date.now();
    
    try {
      // Update database
      await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          visitors: {
            increment: 1,
          },
        },
      });

      // Update cache counter
      await this.redis.incrementCounter(`shop:${shopId}:visitors`);
      
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('update', 'shops', duration, true);
      this.monitoring.trackPerformance('incrementVisitors', duration);
      
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('update', 'shops', duration, false);
      throw error;
    }
  }

  async toggleFollow(shopId: string, userId: string) {
    const startTime = Date.now();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.shopFollower.findUnique({
          where: {
            shopId_userId: {
              shopId,
              userId,
            },
          },
        });

        if (existing) {
          await tx.shopFollower.delete({
            where: {
              shopId_userId: {
                shopId,
                userId,
              },
            },
          });

          let updatedShop = await tx.shop.update({
            where: { id: shopId },
            data: { followers: { decrement: 1 } },
            select: { id: true, slug: true, followers: true },
          });

          if (updatedShop.followers < 0) {
            updatedShop = await tx.shop.update({
              where: { id: shopId },
              data: { followers: 0 },
              select: { id: true, slug: true, followers: true },
            });
          }

          return { followed: false, shop: updatedShop };
        }

        await tx.shopFollower.create({
          data: {
            shopId,
            userId,
          },
        });

        const updatedShop = await tx.shop.update({
          where: { id: shopId },
          data: { followers: { increment: 1 } },
          select: { id: true, slug: true, followers: true },
        });

        return { followed: true, shop: updatedShop };
      });

      await this.redis.invalidateShopCache(result.shop.id, result.shop.slug);

      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('transaction', 'shop_followers', duration, true);
      this.monitoring.trackPerformance('toggleFollow', duration);

      return { followed: result.followed, followers: result.shop.followers };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('transaction', 'shop_followers', duration, false);
      throw error;
    }
  }

  async updateShopDesign(shopId: string, designConfig: any) {
    const startTime = Date.now();
    
    try {
      // Update database
      const updatedShop = await this.prisma.shop.update({
        where: { id: shopId },
        data: {
          pageDesign: designConfig,
        },
      });

      // Invalidate cache for this shop
      await this.redis.invalidateShopCache(shopId, updatedShop.slug);
      
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('update', 'shops', duration, true);
      this.monitoring.trackPerformance('updateShopDesign', duration);
      
      return updatedShop;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('update', 'shops', duration, false);
      throw error;
    }
  }

  async getShopAnalytics(shopId: string, range?: { from?: Date; to?: Date }) {
    const startTime = Date.now();
    const from = range?.from;
    const to = range?.to;
    const cacheKey = `shop:${shopId}:analytics:${from ? from.toISOString() : 'null'}:${to ? to.toISOString() : 'null'}`;
    
    try {
      // Try to get from cache first (cache for 5 minutes)
      const cachedAnalytics = await this.redis.get(cacheKey);
      if (cachedAnalytics) {
        const duration = Date.now() - startTime;
        this.monitoring.trackCache('getShopAnalytics', cacheKey, true, duration);
        this.monitoring.trackPerformance('getShopAnalytics_cached', duration);
        return cachedAnalytics;
      }

      const now = new Date();
      const effectiveTo = to && !Number.isNaN(to.getTime()) ? to : now;
      const effectiveFrom = from && !Number.isNaN(from.getTime()) ? from : new Date(effectiveTo.getTime() - 30 * 24 * 60 * 60 * 1000);

      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        select: { id: true, visitors: true, followers: true },
      });

      const ordersInRange = await this.prisma.order.findMany({
        where: {
          shopId,
          createdAt: {
            gte: effectiveFrom,
            lte: effectiveTo,
          },
        },
        select: { id: true, userId: true, total: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      const totalRevenue = ordersInRange.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
      const totalOrders = ordersInRange.length;
      const userIds = new Set(ordersInRange.map((o) => String(o.userId)));
      const totalUsers = userIds.size;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const todayOrders = ordersInRange.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= todayStart.getTime() && t < todayEnd.getTime();
      });

      const salesCountToday = todayOrders.length;
      const revenueToday = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      // Last 7 days chart (within available range)
      const chartFrom = new Date(effectiveTo);
      chartFrom.setHours(0, 0, 0, 0);
      chartFrom.setDate(chartFrom.getDate() - 6);

      const chartBuckets: Record<string, number> = {};
      for (let i = 0; i < 7; i += 1) {
        const d = new Date(chartFrom);
        d.setDate(chartFrom.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        chartBuckets[key] = 0;
      }

      for (const o of ordersInRange) {
        const dt = new Date(o.createdAt);
        const key = dt.toISOString().slice(0, 10);
        if (typeof chartBuckets[key] === 'number') {
          chartBuckets[key] += Number(o.total) || 0;
        }
      }

      const chartData = Object.keys(chartBuckets)
        .sort()
        .map((key) => {
          const d = new Date(key);
          return {
            name: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
            sales: Math.round(chartBuckets[key]),
          };
        });

      const result = {
        totalRevenue,
        totalOrders,
        totalUsers,
        visitorsCount: Number(shop?.visitors || 0),
        followersCount: Number(shop?.followers || 0),
        salesCountToday,
        revenueToday,
        chartData,
      };

      // Cache analytics for 5 minutes
      await this.redis.set(cacheKey, result, 300);
      
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findMany', 'orders', duration, true);
      this.monitoring.trackPerformance('getShopAnalytics_database', duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackDatabase('findMany', 'shop_analytics', duration, false);
      throw error;
    }
  }

  // Cache management methods
  async clearShopCache(shopId: string, slug?: string) {
    const startTime = Date.now();
    
    try {
      await this.redis.invalidateShopCache(shopId, slug);
      
      const duration = Date.now() - startTime;
      this.monitoring.trackCache('invalidateShopCache', `shop:${shopId}`, false, duration);
      this.monitoring.trackPerformance('clearShopCache', duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackCache('invalidateShopCache', `shop:${shopId}`, false, duration);
      throw error;
    }
  }

  async warmCache() {
    const startTime = Date.now();
    
    try {
      // Pre-populate cache with popular shops
      const popularShops = await this.prisma.shop.findMany({
        where: { 
          isActive: true, 
          status: 'APPROVED',
          visitors: { gte: 100 } // Popular shops
        },
        take: 20,
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          _count: { select: { products: true, offers: true } },
        },
      });

      // Cache popular shops
      for (const shop of popularShops) {
        await this.redis.cacheShop(shop.id, shop, 3600);
      }

      // Cache shops list
      await this.redis.cacheShopsList(popularShops, 1800);
      
      const duration = Date.now() - startTime;
      this.monitoring.trackPerformance('warmCache', duration);
      this.monitoring.logBusiness('cache_warmed', { shopsCount: popularShops.length });
      
      return popularShops.length;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitoring.trackPerformance('warmCache', duration);
      throw error;
    }
  }
}
