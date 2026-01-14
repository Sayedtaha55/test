import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request, BadRequestException, Inject } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { ReservationService } from './reservation.service';

@Controller('api/v1/reservations')
export class ReservationController {
  constructor(
    @Inject(ReservationService) private readonly reservationService: ReservationService,
  ) {}

  @Post()
  async create(@Body() body: any) {
    return this.reservationService.create({
      itemId: body?.itemId,
      itemName: body?.itemName,
      itemImage: body?.itemImage,
      itemPrice: body?.itemPrice,
      shopId: body?.shopId,
      shopName: body?.shopName,
      customerName: body?.customerName,
      customerPhone: body?.customerPhone,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async listMine(@Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('غير مصرح');
    }
    return this.reservationService.listByUserId(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  async listByShop(@Query('shopId') shopId: string, @Request() req) {
    const role = String(req.user?.role || '').toUpperCase();
    const shopIdFromToken = req.user?.shopId;
    const shopIdFromQuery = typeof shopId === 'string' ? shopId : undefined;

    const targetShopId = role === 'ADMIN' ? shopIdFromQuery : shopIdFromToken;
    if (!targetShopId) {
      throw new BadRequestException('shopId مطلوب');
    }

    return this.reservationService.listByShop(targetShopId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  async updateStatus(@Param('id') id: string, @Body() body: any, @Request() req) {
    return this.reservationService.updateStatus(id, body?.status, { role: req.user?.role, shopId: req.user?.shopId });
  }
}
