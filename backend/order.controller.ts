import { Controller, Get, Post, Body, Query, UseGuards, Request, BadRequestException, Inject } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { OrderService } from './order.service';

function parseOptionalDate(value: any) {
  if (!value) return undefined;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

@Controller('api/v1/orders')
export class OrderController {
  constructor(@Inject(OrderService) private readonly orderService: OrderService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant')
  async listMine(@Query('from') from: string, @Query('to') to: string, @Request() req) {
    const shopId = req.user?.shopId;
    if (!shopId) {
      throw new BadRequestException('shopId غير متوفر');
    }

    return this.orderService.listByShop(shopId, { role: req.user?.role, shopId }, {
      from: parseOptionalDate(from),
      to: parseOptionalDate(to),
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  async listByShop(@Query('shopId') shopId: string, @Query('from') from: string, @Query('to') to: string, @Request() req) {
    const role = String(req.user?.role || '').toUpperCase();
    const shopIdFromToken = req.user?.shopId;
    const shopIdFromQuery = typeof shopId === 'string' ? shopId : undefined;

    const targetShopId = role === 'ADMIN' ? shopIdFromQuery : shopIdFromToken;
    if (!targetShopId) {
      throw new BadRequestException('shopId مطلوب');
    }

    return this.orderService.listByShop(targetShopId, { role: req.user?.role, shopId: req.user?.shopId }, {
      from: parseOptionalDate(from),
      to: parseOptionalDate(to),
    });
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async listAllAdmin(
    @Query('shopId') shopId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.orderService.listAllAdmin({
      shopId: typeof shopId === 'string' ? shopId : undefined,
      from: parseOptionalDate(from),
      to: parseOptionalDate(to),
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer', 'merchant', 'admin')
  async create(@Body() body: any, @Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('غير مصرح');
    }

    const shopId = String(body?.shopId || '').trim();
    const items = Array.isArray(body?.items) ? body.items : [];
    const total = typeof body?.total === 'number' ? body.total : Number(body?.total);

    return this.orderService.createOrder({
      shopId,
      userId,
      items,
      total: Number.isNaN(total) ? undefined : total,
      paymentMethod: body?.paymentMethod,
      status: body?.status,
    }, { role: req.user?.role, shopId: req.user?.shopId });
  }
}
