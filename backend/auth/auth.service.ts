
import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

type IncomingRole = 'customer' | 'merchant' | 'admin' | 'CUSTOMER' | 'MERCHANT' | 'ADMIN';
type IncomingShopCategory =
  | 'RETAIL'
  | 'RESTAURANT'
  | 'SERVICE'
  | 'ELECTRONICS'
  | 'FASHION'
  | 'FOOD'
  | 'HEALTH'
  | 'OTHER';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(JwtService) private jwtService: JwtService,
  ) {}

  private slugify(value: string) {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureUniqueSlug(base: string) {
    const baseSlug = this.slugify(base) || `shop-${Date.now()}`;
    let slug = baseSlug;
    let i = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await this.prisma.shop.findUnique({ where: { slug } });
      if (!exists) return slug;
      i += 1;
      slug = `${baseSlug}-${i}`;
    }
  }

  private normalizeRole(role?: IncomingRole) {
    const r = String(role || 'CUSTOMER').toUpperCase();
    if (r === 'MERCHANT') return 'MERCHANT' as any;
    if (r === 'ADMIN') return 'ADMIN' as any;
    return 'CUSTOMER' as any;
  }

  private normalizeShopCategory(category?: IncomingShopCategory) {
    const c = String(category || 'RETAIL').toUpperCase();
    const allowed = new Set([
      'RETAIL',
      'RESTAURANT',
      'SERVICE',
      'ELECTRONICS',
      'FASHION',
      'FOOD',
      'HEALTH',
      'OTHER',
    ]);
    return allowed.has(c) ? c : 'RETAIL' as any;
  }

  /**
   * تسجيل مستخدم جديد مع تشفير كلمة المرور والتحقق من القوة
   */
  async signup(dto: any) {
    const {
      email,
      password,
      name,
      phone,
      role,
      shopName,
      category,
      governorate,
      city,
      shopEmail,
      shopPhone,
      openingHours,
      addressDetailed,
      shopDescription,
    } = dto;

    if (!email || typeof email !== 'string') {
      throw new BadRequestException('البريد الإلكتروني مطلوب');
    }
    if (!password || typeof password !== 'string') {
      throw new BadRequestException('كلمة المرور مطلوبة');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const normalizedRole = this.normalizeRole(role);

    // 1. التحقق من صحة المدخلات
    if (password.length < 8) {
      throw new BadRequestException('كلمة المرور ضعيفة جداً');
    }

    if (normalizedRole === 'MERCHANT') {
      if (!shopName || !governorate || !city) {
        throw new BadRequestException('بيانات المحل غير مكتملة');
      }

      if (!shopPhone && !phone) {
        throw new BadRequestException('رقم موبايل المحل مطلوب');
      }
    }

    // 2. التأكد من عدم وجود المستخدم مسبقاً
    const existingUser = await this.prisma.user.findUnique({ 
      where: { email: normalizedEmail } 
    });
    
    if (existingUser) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل في نظامنا');
    }

    // 3. تشفير كلمة المرور (Hashing with Salt)
    const salt = await bcrypt.genSalt(12); // زيادة الـ Salt لزيادة الأمان
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. حفظ المستخدم والمتجر (إن وجد) في قاعدة البيانات داخل Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          name,
          phone,
          password: hashedPassword,
          role: normalizedRole,
        },
      });

      if (normalizedRole !== 'MERCHANT') {
        return { user: createdUser };
      }

      const slug = await this.ensureUniqueSlug(shopName || name || `shop-${createdUser.id}`);
      const createdShop = await tx.shop.create({
        data: {
          name: shopName,
          slug,
          description: shopDescription || null,
          category: this.normalizeShopCategory(category),
          governorate,
          city,
          phone: shopPhone || phone,
          email: (shopEmail || normalizedEmail) as any,
          openingHours: openingHours || null,
          addressDetailed: addressDetailed || null,
          ownerId: createdUser.id,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: createdUser.id },
        data: { shopId: createdShop.id },
      });

      return { user: updatedUser, shop: createdShop };
    });

    return this.generateToken(result.user);
  }

  /**
   * تسجيل الدخول والتحقق الآمن
   */
  async login(email: string, pass: string) {
    if (!email || typeof email !== 'string' || !pass || typeof pass !== 'string') {
      throw new BadRequestException('البريد الإلكتروني وكلمة المرور مطلوبان');
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ 
      where: { email: normalizedEmail } 
    });

    // Default admin bootstrap (development/testing)
    // Allows the admin UI to work with real DB + JWT instead of mock fallbacks.
    if (!user && (normalizedEmail === 'admin' || normalizedEmail === 'admin@ray.com')) {
      const allowed = new Set(['1234', 'admin123']);
      if (allowed.has(pass)) {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(pass, salt);
        user = await this.prisma.user.create({
          data: {
            email: normalizedEmail,
            name: 'Admin',
            password: hashedPassword,
            role: 'ADMIN' as any,
            isActive: true,
          },
        });
      }
    }
    
    if (!user) {
      // رسالة مبهمة لمنع الـ Account Enumeration
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    // تحديث تاريخ آخر ظهور (Last Login)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    return this.generateToken(user);
  }

  /**
   * توليد توكن JWT آمن
   */
  private generateToken(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role,
      shopId: user.shopId 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        shopId: user.shopId
      }
    };
  }
}
