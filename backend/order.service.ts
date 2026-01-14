import { Injectable, Inject, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  private normalizeStatus(status?: string) {
    const s = String(status || '').trim().toUpperCase();
    if (s === 'DELIVERED') return 'DELIVERED' as any;
    if (s === 'CONFIRMED') return 'CONFIRMED' as any;
    if (s === 'PREPARING') return 'PREPARING' as any;
    if (s === 'READY') return 'READY' as any;
    if (s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED' as any;
    if (s === 'REFUNDED') return 'REFUNDED' as any;
    return 'PENDING' as any;
  }

  async listByShop(shopId: string, actor: { role: string; shopId?: string }, query?: { from?: Date; to?: Date }) {
    const targetShopId = String(shopId || '').trim();
    if (!targetShopId) throw new BadRequestException('shopId مطلوب');

    const role = String(actor?.role || '').toUpperCase();
    if (role !== 'ADMIN' && actor?.shopId !== targetShopId) {
      throw new ForbiddenException('صلاحيات غير كافية');
    }

    const from = query?.from;
    const to = query?.to;

    const orders = await this.prisma.order.findMany({
      where: {
        shopId: targetShopId,
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return orders;
  }

  async listAllAdmin(query?: { shopId?: string; from?: Date; to?: Date }) {
    const shopId = query?.shopId ? String(query.shopId).trim() : undefined;
    const from = query?.from;
    const to = query?.to;

    return this.prisma.order.findMany({
      where: {
        ...(shopId ? { shopId } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shop: true,
        user: true,
      },
    });
  }

  async createOrder(input: {
    shopId: string;
    userId: string;
    items: Array<{ productId?: string; id?: string; quantity: number }>;
    total?: number;
    paymentMethod?: string;
    status?: string;
  }, actor: { role: string; shopId?: string }) {
    const shopId = String(input?.shopId || '').trim();
    const userId = String(input?.userId || '').trim();

    if (!shopId) throw new BadRequestException('shopId مطلوب');
    if (!userId) throw new BadRequestException('غير مصرح');

    const role = String(actor?.role || '').toUpperCase();
    if (role === 'MERCHANT' && actor?.shopId !== shopId) {
      throw new ForbiddenException('صلاحيات غير كافية');
    }

    const items = Array.isArray(input?.items) ? input.items : [];
    if (items.length === 0) {
      throw new BadRequestException('items مطلوبة');
    }

    const normalizedItems = items.map((i) => ({
      productId: String(i.productId || i.id || '').trim(),
      quantity: Number(i.quantity),
    }));

    if (normalizedItems.some((i) => !i.productId)) {
      throw new BadRequestException('productId مطلوب');
    }

    if (normalizedItems.some((i) => Number.isNaN(i.quantity) || i.quantity <= 0)) {
      throw new BadRequestException('quantity غير صحيحة');
    }

    const status = this.normalizeStatus(input?.status);

    const productIds = Array.from(new Set(normalizedItems.map((i) => i.productId)));

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, shopId, isActive: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('بعض المنتجات غير متاحة');
      }

      const byId: Record<string, any> = {};
      for (const p of products) byId[p.id] = p;

      // Validate stock
      for (const item of normalizedItems) {
        const product = byId[item.productId];
        const currentStock = typeof product?.stock === 'number' ? product.stock : Number(product?.stock || 0);
        if (currentStock < item.quantity) {
          throw new BadRequestException('المخزون غير كاف');
        }
      }

      // Update stock
      for (const item of normalizedItems) {
        const product = byId[item.productId];
        const currentStock = typeof product?.stock === 'number' ? product.stock : Number(product?.stock || 0);
        const nextStock = Math.max(0, currentStock - item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: nextStock },
        });
      }

      const computedTotal = normalizedItems.reduce((sum, item) => {
        const product = byId[item.productId];
        const price = typeof product?.price === 'number' ? product.price : Number(product?.price || 0);
        return sum + price * item.quantity;
      }, 0);

      const total = typeof input.total === 'number' && !Number.isNaN(input.total) && input.total >= 0
        ? input.total
        : computedTotal;

      const created = await tx.order.create({
        data: {
          shopId,
          userId,
          total,
          status,
          paymentMethod: input?.paymentMethod ? String(input.paymentMethod) : null,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: typeof byId[item.productId]?.price === 'number' ? byId[item.productId].price : Number(byId[item.productId]?.price || 0),
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      return created;
    });
  }
}
