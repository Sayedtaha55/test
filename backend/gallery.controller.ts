import { Controller, Post, Get, Delete, UseGuards, Request, Body, Param, UploadedFile, UseInterceptors, Inject } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { GalleryService } from './gallery.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@Controller('api/v1/gallery')
export class GalleryController {
  constructor(
    @Inject(GalleryService) private readonly galleryService: GalleryService,
  ) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const dest = './uploads/gallery';
        try {
          fs.mkdirSync(dest, { recursive: true });
        } catch {
          // ignore
        }
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, WebP, and AVIF images are allowed'), false);
      }
    }
  }))
  async uploadImage(
    @UploadedFile() file: any,
    @Request() req,
    @Body('caption') caption?: string,
    @Body('shopId') shopId?: string,
  ) {
    const userId = req.user.id;
    return this.galleryService.uploadImage(userId, file, caption, shopId);
  }

  @Get(':shopId')
  async getGallery(@Param('shopId') shopId: string) {
    return this.galleryService.getGalleryByShop(shopId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  async deleteImage(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.galleryService.deleteImage(userId, id);
  }

  @Post(':id/caption')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('merchant', 'admin')
  async updateCaption(
    @Param('id') id: string,
    @Request() req,
    @Body('caption') caption: string,
  ) {
    const userId = req.user.id;
    return this.galleryService.updateCaption(userId, id, caption);
  }
}
