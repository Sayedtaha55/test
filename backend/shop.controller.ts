
import { Controller, Get, Post, Param, Body, Patch, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';

@Controller('api/v1/shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  async findAll() {
    return this.shopService.getAllShops();
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const shop = await this.shopService.getShopBySlug(slug);
    // تسجيل زيارة (Analytics)
    await this.shopService.incrementVisitors(shop.id);
    return shop;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async follow(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.shopService.toggleFollow(id, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant')
  @Patch(':id/design')
  async updateDesign(@Param('id') id: string, @Body() designConfig: any, @Request() req) {
    // التحقق من أن التاجر يملك هذا المتجر فعلاً
    if (req.user.shopId !== id) {
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا المتجر');
    }
    return this.shopService.updateShopDesign(id, designConfig);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant')
  async getAnalytics(@Param('id') id: string, @Request() req) {
    if (req.user.shopId !== id) {
      throw new ForbiddenException('صلاحيات غير كافية');
    }
    return this.shopService.getShopAnalytics(id);
  }
}
