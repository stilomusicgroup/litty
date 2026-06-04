/**
 * OAuth Callback Route
 *
 * This route handles OAuth callbacks from Poof's OAuth service.
 * When a user completes OAuth with a provider (Twitter, Google, etc.),
 * Poof redirects back here with a signed JWT containing the connection data.
 *
 * To enable this route:
 * 1. Uncomment the import and registration in routes/index.ts
 * 2. Customize the logic below (optional)
 * 3. Deploy your app
 *
 * The route will:
 * 1. Verify the JWT signature (proves it came from Poof)
 * 2. Store the social connection in your database
 * 3. Run any custom logic you add (airdrops, welcome messages, etc.)
 * 4. Redirect back to your frontend
 */
import type { Context } from 'hono';
export declare function oauthCallbackHandler(c: Context): Promise<Response & import("hono").TypedResponse<undefined, 302, "redirect">>;
