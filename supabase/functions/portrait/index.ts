import { HttpError } from '../_shared/ai.ts';
import { guarded } from '../_shared/guard.ts';

// No image-generation provider is chosen yet. Plug one in behind this function (keep keys in secrets),
// then return { imageBase64 } or a short-lived signed URL. Quota (Pro-only) is already enforced by guarded().
Deno.serve(guarded('portrait', async () => {
  throw new HttpError(501, 'portrait_provider_not_configured');
}));
