import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
// import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { ShopModule } from './shop.module';
import { ProductModule } from './product.module';
import { GalleryModule } from './gallery.module';
import { ReservationModule } from './reservation.module';
import { OrderModule } from './order.module';
import { OfferModule } from './offer.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { TestController } from './test.controller';
import { HealthController } from './health.controller';
import { DatabaseTestController } from './db-test.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    // RedisModule, // Temporarily disabled
    AuthModule,
    ShopModule,
    ProductModule,
    GalleryModule,
    ReservationModule,
    OrderModule,
    OfferModule,
    MonitoringModule,
  ],
  controllers: [TestController, HealthController, DatabaseTestController],
})
export class AppModule {}
