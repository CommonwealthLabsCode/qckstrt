import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HmacSignerService } from 'src/common/services/hmac-signer.service';
import { WebSocketAuthService } from 'src/common/auth/websocket-auth.service';

/**
 * Gateway Services Module
 *
 * Provides services needed by the GraphQL Gateway that must be available
 * during the async module configuration phase.
 *
 * These services are extracted to a separate module so they can be imported
 * by GraphQLModule.forRootAsync and have their dependencies resolved.
 */
@Module({
  imports: [ConfigModule],
  providers: [HmacSignerService, WebSocketAuthService],
  exports: [HmacSignerService, WebSocketAuthService],
})
export class GatewayServicesModule {}
