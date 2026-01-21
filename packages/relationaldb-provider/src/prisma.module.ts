import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";

/**
 * PrismaModule provides the PrismaService globally across the application.
 * Being marked as @Global(), it only needs to be imported once in the root module.
 *
 * Usage:
 * ```typescript
 * import { PrismaModule } from '@qckstrt/relationaldb-provider';
 *
 * @Module({
 *   imports: [PrismaModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
