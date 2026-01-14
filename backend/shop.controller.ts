
import { Controller, Get, Post, Param, Body, Patch, UseGuards, Request, ForbiddenException, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';

@Controller('api/v1/shops')
export class ShopController {
  constructor(@Inject(ShopService) private readonly shopService: ShopService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  async getMyShop(@Request() req) {
    const shopId = req.user?.shopId;
    if (!shopId) {
      throw new NotFoundException('لا يوجد متجر مرتبط بهذا الحساب');
    }
    const shop = await this.shopService.getShopById(shopId);
    if (!shop) {
      throw new NotFoundException('لم يتم العثور على المتجر');
    }
    return shop;
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  async updateMyShop(@Request() req, @Body() body: any) {
    const userRole = String(req.user?.role || '').toUpperCase();
    const shopIdFromToken = req.user?.shopId;
    const shopIdFromBody = typeof body?.shopId === 'string' ? body.shopId : undefined;

    const targetShopId = userRole === 'ADMIN' ? shopIdFromBody : shopIdFromToken;

    if (!targetShopId) {
      throw new NotFoundException('لا يوجد متجر مرتبط بهذا الحساب');
    }

    return this.shopService.updateShopSettings(targetShopId, {
      name: typeof body?.name === 'string' ? body.name : undefined,
      description: typeof body?.description === 'string' ? body.description : undefined,
      category: typeof body?.category === 'string' ? body.category : undefined,
      governorate: typeof body?.governorate === 'string' ? body.governorate : undefined,
      city: typeof body?.city === 'string' ? body.city : undefined,
      addressDetailed: typeof body?.addressDetailed === 'string' ? body.addressDetailed : undefined,
      phone: typeof body?.phone === 'string' ? body.phone : undefined,
      email: typeof body?.email === 'string' ? body.email : undefined,
      openingHours: typeof body?.openingHours === 'string' ? body.openingHours : undefined,
      logoUrl: typeof body?.logoUrl === 'string' ? body.logoUrl : undefined,
      bannerUrl: typeof body?.bannerUrl === 'string' ? body.bannerUrl : undefined,
      whatsapp: typeof body?.whatsapp === 'string' ? body.whatsapp : undefined,
      customDomain: typeof body?.customDomain === 'string' ? body.customDomain : undefined,
    });
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async adminList(@Query('status') status: string = 'ALL') {
    const normalized = String(status || 'ALL').toUpperCase();
    const allowed = new Set(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ALL']);
    if (!allowed.has(normalized)) {
      throw new BadRequestException('قيمة status غير صحيحة');
    }
    return this.shopService.getShopsByStatus(normalized as any);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async adminGetById(@Param('id') id: string) {
    const shop = await this.shopService.getShopById(id);
    if (!shop) {
      throw new NotFoundException('لم يتم العثور على المتجر');
    }
    return shop;
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async adminUpdateStatus(
    @Param('id') id: string,
    @Body() body: { status?: string; action?: string },
  ) {
    const incoming = (body?.status || body?.action || '').toString().trim();
    if (!incoming) {
      throw new BadRequestException('status مطلوب');
    }

    const normalized = incoming.toUpperCase();
    const mapped =
      normalized === 'APPROVED' || normalized === 'APPROVE' || normalized === 'APPROVEDSHOP'
        ? 'APPROVED'
        : normalized === 'REJECTED' || normalized === 'REJECT'
          ? 'REJECTED'
          : normalized === 'PENDING'
            ? 'PENDING'
            : normalized === 'SUSPENDED' || normalized === 'SUSPEND'
              ? 'SUSPENDED'
              : null;

    if (!mapped) {
      throw new BadRequestException('قيمة status غير صحيحة');
    }

    return this.shopService.updateShopStatus(id, mapped as any);
  }

  @Get()
  async findAll() {
    return this.shopService.getAllShops();
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const shop = await this.shopService.getShopBySlug(slug);
    if (!shop) {
      throw new NotFoundException('لم يتم العثور على المتجر');
    }
    // تسجيل زيارة (Analytics)
    await this.shopService.incrementVisitors(shop.id);
    return shop;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  async follow(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id;
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
  @Roles('merchant', 'admin')
  async getAnalytics(@Param('id') id: string, @Query('from') from: string, @Query('to') to: string, @Request() req) {
    const role = String(req.user?.role || '').toUpperCase();
    if (role !== 'ADMIN' && req.user.shopId !== id) {
      throw new ForbiddenException('صلاحيات غير كافية');
    }
    const fromDate = from ? new Date(String(from)) : undefined;
    const toDate = to ? new Date(String(to)) : undefined;
    return this.shopService.getShopAnalytics(id, {
      from: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
      to: toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined,
    });
  }
}
