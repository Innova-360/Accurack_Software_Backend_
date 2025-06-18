import { SetMetadata } from '@nestjs/common';
import { SKIP_RESPONSE_TRANSFORM } from '../interceptors/response.interceptor';

/**
 * Decorator to skip automatic response transformation
 * Use this when you want to return a custom response format
 */
export const SkipResponseTransform = () =>
  SetMetadata(SKIP_RESPONSE_TRANSFORM, true);
