
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * تسجيل مستخدم جديد مع تشفير كلمة المرور والتحقق من القوة
   */
  async signup(dto: any) {
    const { email, password, name, phone, role } = dto;

    // 1. التحقق من صحة المدخلات
    if (password.length < 8) {
      throw new BadRequestException('كلمة المرور ضعيفة جداً');
    }

    // 2. التأكد من عدم وجود المستخدم مسبقاً
    const existingUser = await this.prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    if (existingUser) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل في نظامنا');
    }

    // 3. تشفير كلمة المرور (Hashing with Salt)
    const salt = await bcrypt.genSalt(12); // زيادة الـ Salt لزيادة الأمان
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. حفظ المستخدم في قاعدة البيانات
    const user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        phone,
        password: hashedPassword,
        role: role || 'customer',
      },
    });

    return this.generateToken(user);
  }

  /**
   * تسجيل الدخول والتحقق الآمن
   */
  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
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
      access_token: this.jwtService.sign(payload, {
        expiresIn: '7d', // التوكن صالح لمدة أسبوع
        secret: process.env.JWT_SECRET
      }),
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
