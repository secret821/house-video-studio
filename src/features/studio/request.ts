import { requestData, type ApiRequestOptions } from '@/share/request';

import { workspaceRequest } from './auth/auth-api';

/** Studio business APIs share the page's frozen workspace identity. */
export function studioRequest<T>(path: string, options: ApiRequestOptions<T>) {
  return requestData(`/api/${path}`, {
    ...options,
    prepare: workspaceRequest,
  });
}
