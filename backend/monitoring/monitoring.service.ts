import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private metrics: Map<string, any> = new Map();
  private alerts: any[] = [];
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(LoggerService) private readonly logger: LoggerService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    // @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  onModuleInit() {
    this.startMetricsCollection();
    this.setupDefaultHealthChecks();
  }

  onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.logger.log('Monitoring service shutting down');
  }

  // Metrics collection
  private startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.checkAlerts();
    }, 30000); // Every 30 seconds
  }

  private async collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.set('memory', {
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
    });

    this.metrics.set('uptime', process.uptime());
    this.metrics.set('timestamp', new Date().toISOString());
  }

  // Performance tracking
  trackPerformance(operation: string, duration: number) {
    const key = `performance:${operation}`;
    const current = this.metrics.get(key) || { count: 0, totalDuration: 0, avgDuration: 0 };
    
    current.count++;
    current.totalDuration += duration;
    current.avgDuration = Math.round(current.totalDuration / current.count);
    current.lastDuration = duration;

    this.metrics.set(key, current);
    this.logger.logPerformance(operation, duration);

    // Alert if performance is poor
    if (duration > 5000) { // 5 seconds
      this.createAlert('performance', `Slow operation: ${operation}`);
    }
  }

  // API metrics
  trackApiCall(method: string, endpoint: string, statusCode: number, duration: number) {
    const key = `api:${method}:${endpoint}`;
    const current = this.metrics.get(key) || { count: 0, errors: 0, avgDuration: 0 };

    current.count++;
    if (statusCode >= 400) {
      current.errors++;
    }
    
    // Update average duration
    const totalDuration = (current.avgDuration * (current.count - 1)) + duration;
    current.avgDuration = Math.round(totalDuration / current.count);

    this.metrics.set(key, current);

    // Log the request
    this.logger.logRequest(method, endpoint, statusCode, duration);

    // Alert for high error rates
    const errorRate = current.errors / current.count;
    if (errorRate > 0.1 && current.count > 10) { // 10% error rate
      this.createAlert('api_error', `High error rate on ${method} ${endpoint}`);
    }
  }

  // Database metrics
  trackDatabase(operation: string, table: string, duration: number, success: boolean) {
    const key = `database:${operation}`;
    const current = this.metrics.get(key) || { count: 0, errors: 0, avgDuration: 0 };

    current.count++;
    if (!success) {
      current.errors++;
    }

    const totalDuration = (current.avgDuration * (current.count - 1)) + duration;
    current.avgDuration = Math.round(totalDuration / current.count);

    this.metrics.set(key, current);
    this.logger.logDatabase(operation, table, duration, success);

    // Alert for slow database operations
    if (duration > 2000) { // 2 seconds
      this.createAlert('database', `Slow database operation: ${operation} on ${table}`);
    }
  }

  // Cache metrics
  trackCache(operation: string, key: string, hit: boolean, duration?: number) {
    const cacheKey = `cache:${operation}`;
    const current = this.metrics.get(cacheKey) || { hits: 0, misses: 0, totalRequests: 0 };

    current.totalRequests++;
    if (hit) {
      current.hits++;
    } else {
      current.misses++;
    }

    current.hitRate = Math.round((current.hits / current.totalRequests) * 100);
    this.metrics.set(cacheKey, current);

    this.logger.logCache(operation, key, hit, duration);

    // Alert for low cache hit rate
    if (current.totalRequests > 100 && current.hitRate < 50) {
      this.createAlert('cache', `Low cache hit rate for ${operation}`);
    }
  }

  // Health checks
  private setupDefaultHealthChecks() {
    this.addHealthCheck('database', async () => {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    });

    // this.addHealthCheck('redis', async () => {
    //   try {
    //     return await this.redis.ping();
    //   } catch {
    //     return false;
    //   }
    // });

    this.addHealthCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      return memUsagePercent < 95; // Alert if memory usage is > 95%
    });
  }

  addHealthCheck(name: string, checkFn: () => Promise<boolean>) {
    this.healthChecks.set(name, checkFn);
  }

  async getHealthStatus() {
    const results: Record<string, boolean> = {};
    
    for (const [name, checkFn] of this.healthChecks) {
      try {
        results[name] = await checkFn();
      } catch {
        results[name] = false;
      }
    }

    const overallHealth = Object.values(results).every(status => status);
    
    return {
      status: overallHealth ? 'healthy' : 'unhealthy',
      checks: results,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: this.metrics.get('memory'),
    };
  }

  // Alerts
  private createAlert(message: string, details: any = {}) {
    const alert = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      details,
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    this.alerts.push(alert);
    
    // Safe logging with fallback
    if (this.logger && typeof this.logger.warn === 'function') {
      this.logger.warn(`ALERT: ${message}`, details);
    } else {
      console.warn(`ALERT: ${message}`, details);
    }

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  resolveAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.logger.log(`Alert resolved: ${alert.message}`);
    }
  }

  // Get monitoring data
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  getAlerts(resolved = false) {
    return this.alerts.filter(alert => alert.resolved === resolved);
  }

  // Dashboard data
  async getDashboardData() {
    return {
      metrics: this.getMetrics(),
      health: await this.getHealthStatus(),
      alerts: {
        active: this.getAlerts(false).length,
        recent: this.getAlerts(false).slice(-10),
      },
      timestamp: new Date().toISOString(),
    };
  }

  private checkAlerts() {
    // Check memory usage
    const memory = this.metrics.get('memory');
    if (memory && memory.heapUsed > 1000) { // 1GB
      this.createAlert('memory', 'High memory usage detected');
    }

    // Check uptime (for restarts)
    const uptime = this.metrics.get('uptime');
    if (uptime && uptime < 60) { // Just restarted
      this.createAlert('system', 'Application restarted');
    }
  }

  // Business events logging
  logBusiness(event: string, data: any) {
    this.logger.log(`Business Event: ${event}`, {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }
}
