import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ReservationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  private normalizeStatus(status?: string) {
    const s = String(status || '').trim().toUpperCase();
    if (s === 'COMPLETED' || s === 'COMPLETEDRESERVATION') return 'COMPLETED';
    if (s === 'CANCELLED' || s === 'CANCELED' || s === 'EXPIRED') return 'CANCELLED';
    if (s === 'CONFIRMED') return 'CONFIRMED';
    return 'PENDING';
  }

  async create(input: {
    itemId: string;
    itemName: string;
    itemImage?: string | null;
    itemPrice: number;
    shopId: string;
    shopName: string;
    customerName: string;
    customerPhone: string;
  }) {
    const itemId = String(input?.itemId || '').trim();
    const itemName = String(input?.itemName || '').trim();
    const shopId = String(input?.shopId || '').trim();
    const shopName = String(input?.shopName || '').trim();
    const customerName = String(input?.customerName || '').trim();
    const customerPhone = String(input?.customerPhone || '').trim();
    const itemImage = input?.itemImage ? String(input.itemImage) : null;
    const itemPrice = Number(input?.itemPrice);

    if (!itemId) throw new BadRequestException('itemId مطلوب');
    if (!itemName) throw new BadRequestException('itemName مطلوب');
    if (!shopId) throw new BadRequestException('shopId مطلوب');
    if (!shopName) throw new BadRequestException('shopName مطلوب');
    if (!customerName) throw new BadRequestException('customerName مطلوب');
    if (!customerPhone) throw new BadRequestException('customerPhone مطلوب');
    if (Number.isNaN(itemPrice) || itemPrice < 0) throw new BadRequestException('itemPrice غير صحيح');

    const shop = await this.prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } });
    if (!shop) throw new NotFoundException('المتجر غير موجود');

    const existingUser = await this.prisma.user.findUnique({ where: { phone: customerPhone } });

    if (!existingUser) {
      const rawPassword = `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const email = `guest-${customerPhone.replace(/[^0-9]/g, '') || 'user'}-${Date.now()}@guest.local`;
      await this.prisma.user.create({
        data: {
          email,
          name: customerName || 'Guest',
          phone: customerPhone,
          password: hashedPassword,
          role: 'CUSTOMER' as any,
          isActive: true,
        },
      });
    }

    return this.prisma.reservation.create({
      data: {
        itemId,
        itemName,
        itemImage,
        itemPrice,
        shopId,
        shopName,
        customerName,
        customerPhone,
        status: 'PENDING' as any,
      },
    });
  }

  async listByShop(shopId: string) {
    const id = String(shopId || '').trim();
    if (!id) throw new BadRequestException('shopId مطلوب');

    return this.prisma.reservation.findMany({
      where: { shopId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listByUserId(userId: string) {
    const id = String(userId || '').trim();
    if (!id) throw new BadRequestException('userId مطلوب');

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { phone: true },
    });

    const phone = String(user?.phone || '').trim();
    if (!phone) throw new BadRequestException('رقم الهاتف غير متوفر لهذا الحساب');

    return this.listByCustomerPhone(phone);
  }

  async listByCustomerPhone(customerPhone: string) {
    const phone = String(customerPhone || '').trim();
    if (!phone) throw new BadRequestException('customerPhone مطلوب');

    return this.prisma.reservation.findMany({
      where: { customerPhone: phone },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string, actor: { role: string; shopId?: string }) {
    const reservationId = String(id || '').trim();
    if (!reservationId) throw new BadRequestException('id مطلوب');

    const existing = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, shopId: true },
    });

    if (!existing) throw new NotFoundException('الحجز غير موجود');

    const role = String(actor?.role || '').toUpperCase();
    if (role !== 'ADMIN' && actor?.shopId !== existing.shopId) {
      throw new ForbiddenException('صلاحيات غير كافية');
    }

    const normalized = this.normalizeStatus(status);

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: normalized as any },
    });
  }
}
