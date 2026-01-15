import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
// import { RedisService } from './redis/redis.service';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

@Injectable()
export class GalleryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    // @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  private getVariantUrls(imageUrl: string) {
    if (!imageUrl) {
      return { thumbUrl: imageUrl, mediumUrl: imageUrl };
    }

    const base = imageUrl.endsWith('-opt.webp')
      ? imageUrl.replace(/-opt\.webp$/, '')
      : imageUrl.replace(/\.webp$/, '');

    return {
      thumbUrl: `${base}-thumb.webp`,
      mediumUrl: `${base}-md.webp`,
    };
  }

  async uploadImage(userId: string, file: any, caption?: string, shopId?: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Get user's shop
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shop: true }
    });

    if (!user) {
      throw new ForbiddenException('User does not have a shop');
    }

    let targetShopId = user.shop?.id;
    const role = String(user?.role || '').toUpperCase();
    if (!targetShopId && role === 'ADMIN' && shopId) {
      const targetShop = await this.prisma.shop.findUnique({ where: { id: shopId } });
      if (!targetShop) {
        throw new NotFoundException('Shop not found');
      }
      targetShopId = targetShop.id;
    }

    if (!targetShopId) {
      throw new ForbiddenException('User does not have a shop');
    }

    const maxImages = parseInt(process.env.GALLERY_MAX_IMAGES_PER_SHOP || '200', 10);
    const existingCount = await this.prisma.shopGallery.count({
      where: { shopId: targetShopId }
    });

    if (existingCount >= maxImages) {
      try {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {
        // ignore
      }
      throw new BadRequestException(`Maximum ${maxImages} images allowed per gallery`);
    }

    const uploadsDir = path.dirname(file.path);
    const baseName = path.parse(file.filename).name;
    const outputFilename = `${baseName}-opt.webp`;
    const outputPath = path.join(uploadsDir, outputFilename);
    const thumbFilename = `${baseName}-thumb.webp`;
    const thumbPath = path.join(uploadsDir, thumbFilename);
    const mediumFilename = `${baseName}-md.webp`;
    const mediumPath = path.join(uploadsDir, mediumFilename);

    try {
      const inputBuffer = await fs.promises.readFile(file.path);

      await sharp(inputBuffer)
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toFile(outputPath);

      await sharp(inputBuffer)
        .rotate()
        .resize({
          width: 900,
          height: 900,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 78 })
        .toFile(mediumPath);

      await sharp(inputBuffer)
        .rotate()
        .resize({
          width: 320,
          height: 320,
          fit: 'cover',
          withoutEnlargement: true,
        })
        .webp({ quality: 75 })
        .toFile(thumbPath);
    } catch {
      try {
        if (file?.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch {
        // ignore
      }
      throw new BadRequestException('Failed to process image');
    }

    try {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch {
      // ignore
    }

    // Create gallery entry
    const galleryImage = await this.prisma.shopGallery.create({
      data: {
        shopId: targetShopId,
        imageUrl: `/uploads/gallery/${outputFilename}`,
        caption: caption || '',
      }
    });

    // Invalidate cache
    try {
      // await this.redis.del(`gallery:${targetShopId}`);
    } catch {}

    return {
      id: galleryImage.id,
      imageUrl: galleryImage.imageUrl,
      ...this.getVariantUrls(galleryImage.imageUrl),
      caption: galleryImage.caption,
      createdAt: galleryImage.createdAt,
    };
  }

  async getGalleryByShop(shopId: string) {
    const cacheKey = `gallery:${shopId}`;
    
    // Try cache first
    try {
      // const cached = await this.redis.get<any>(cacheKey);
      // if (Array.isArray(cached)) {
      //   return cached;
      // }
    } catch {}

    let images: any[] = [];
    try {
      images = await this.prisma.shopGallery.findMany({
        where: {
          shopId,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          imageUrl: true,
          caption: true,
          createdAt: true,
        },
      });
    } catch (err: any) {
      console.error('getGalleryByShop failed:', err);
      throw new BadRequestException(err?.message || 'Failed to load gallery');
    }

    const mapped = (images || []).map((img: any) => ({
      ...img,
      ...this.getVariantUrls(img?.imageUrl),
    }));

    // Cache for 5 minutes
    try {
      // await this.redis.set(`gallery:${shopId}`, mapped, 300);
    } catch {}

    return mapped;
  }

  async deleteImage(userId: string, imageId: string) {
    // Get user's shop
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shop: true }
    });

    if (!user) {
      throw new ForbiddenException('User does not have a shop');
    }

    const role = String(user?.role || '').toUpperCase();
    const shopId = user.shop?.id;

    if (role !== 'ADMIN' && !shopId) {
      throw new ForbiddenException('User does not have a shop');
    }

    // Find the image
    const image = await this.prisma.shopGallery.findFirst({
      where: role === 'ADMIN'
        ? { id: imageId }
        : { id: imageId, shopId }
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Delete file from filesystem
    const { thumbUrl, mediumUrl } = this.getVariantUrls(image.imageUrl);
    const filesToDelete = [image.imageUrl, mediumUrl, thumbUrl];

    for (const url of filesToDelete) {
      const filePath = path.join(process.cwd(), url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore
        }
      }
    }

    // Delete from database
    await this.prisma.shopGallery.delete({
      where: { id: imageId }
    });

    // Invalidate cache
    try {
      // await this.redis.del(`gallery:${image.shopId}`);
    } catch {
      // ignore
    }

    return { success: true };
  }

  async updateCaption(userId: string, imageId: string, caption: string) {
    // Get user's shop
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shop: true }
    });

    if (!user) {
      throw new ForbiddenException('User does not have a shop');
    }

    const role = String(user?.role || '').toUpperCase();
    const shopId = user.shop?.id;

    if (role !== 'ADMIN' && !shopId) {
      throw new ForbiddenException('User does not have a shop');
    }

    if (role === 'ADMIN') {
      const existing = await this.prisma.shopGallery.findUnique({
        where: { id: imageId },
        select: { id: true, shopId: true },
      });
      if (!existing) {
        throw new NotFoundException('Image not found');
      }

      await this.prisma.shopGallery.update({
        where: { id: imageId },
        data: { caption },
      });

      try {
        // await this.redis.del(`gallery:${existing.shopId}`);
      } catch {}

      return { success: true };
    }

    // Update the image
    const image = await this.prisma.shopGallery.updateMany({
      where: { 
        id: imageId,
        shopId 
      },
      data: { caption }
    });

    if (image.count === 0) {
      throw new NotFoundException('Image not found');
    }

    // Invalidate cache
    try {
      // await this.redis.del(`gallery:${shopId}`);
    } catch {
      // ignore
    }

    return { success: true };
  }
}
