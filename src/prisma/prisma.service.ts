import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private static readonly MAX_RETRIES = 5;
  private static readonly BASE_DELAY_MS = 2000;

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async connectWithRetry() {
    for (let attempt = 1; attempt <= PrismaService.MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Successfully connected to the database');
        return;
      } catch (error) {
        const delay = PrismaService.BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Database connection attempt ${attempt}/${PrismaService.MAX_RETRIES} failed. ` +
          `Retrying in ${delay / 1000}s... (${error.message})`,
        );
        if (attempt === PrismaService.MAX_RETRIES) {
          this.logger.error(
            'Could not connect to the database after maximum retries. ' +
            'Please check that DATABASE_URL is correct and the database server is reachable.',
          );
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }


}
