import {
  GraphQLDataSourceProcessOptions,
  RemoteGraphQLDataSource,
} from '@apollo/gateway';
import { HmacSignerService } from 'src/common/services/hmac-signer.service';

/**
 * Gateway context passed to data source
 */
interface GatewayContext {
  user?: string;
}

/**
 * Custom RemoteGraphQLDataSource that adds HMAC authentication to requests.
 *
 * This ensures that microservices can verify requests originated from
 * the trusted API Gateway, not from direct external access.
 *
 * SECURITY: This replaces the frontend HMAC signing (which exposed secrets
 * in the browser) with gateway-side signing.
 *
 * @see https://github.com/CommonwealthLabsCode/qckstrt/issues/185
 */
export class HmacRemoteGraphQLDataSource extends RemoteGraphQLDataSource<GatewayContext> {
  private readonly hmacSigner: HmacSignerService;

  constructor(config: { url?: string }, hmacSigner: HmacSignerService) {
    super(config);
    this.hmacSigner = hmacSigner;
  }

  willSendRequest({
    request,
    context,
  }: GraphQLDataSourceProcessOptions<GatewayContext>) {
    // Forward authenticated user to microservices
    if (context?.user) {
      request.http?.headers.set('user', context.user);
    }

    // Sign request with HMAC for microservice authentication
    if (this.hmacSigner.isEnabled() && request.http?.url) {
      const hmacHeader = this.hmacSigner.signGraphQLRequest(request.http.url);
      if (hmacHeader) {
        request.http?.headers.set('X-HMAC-Auth', hmacHeader);
      }
    }
  }
}
