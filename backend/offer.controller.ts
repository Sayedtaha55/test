import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, BadRequestException, Inject } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { OfferService } from './offer.service';

@Controller('api/v1/offers')
export class OfferController {
  constructor(@Inject(OfferService) private readonly offerService: OfferService) {}

  @Get()
  async listActive() {
    return this.offerService.listActive();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  async create(@Body() body: any, @Request() req) {
    const shopId = String(body?.shopId || '').trim();
    if (!shopId) throw new BadRequestException('shopId مطلوب');

    return this.offerService.create({
      shopId,
      productId: body?.productId,
      title: body?.title,
      description: body?.description,
      discount: body?.discount,
      oldPrice: body?.oldPrice,
      newPrice: body?.newPrice,
      imageUrl: body?.imageUrl,
      expiresAt: body?.expiresAt,
    }, { role: req.user?.role, shopId: req.user?.shopId });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  async deactivate(@Param('id') id: string, @Request() req) {
    return this.offerService.deactivate(id, { role: req.user?.role, shopId: req.user?.shopId });
  }
}
