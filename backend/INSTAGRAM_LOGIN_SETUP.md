# Instagram Login setup

JustDMs supports Instagram professional accounts without requiring a linked
Facebook Page through Instagram API with Instagram Login.

1. In Meta for Developers, open the JustDMs app and add the Instagram API use
   case for messaging and comment management.
2. In the Instagram API setup, add this exact OAuth redirect URI:

   `https://api.justdms.in/auth/instagram/callback`

3. Add the following Render environment variables:

   - `INSTAGRAM_APP_ID`
   - `INSTAGRAM_APP_SECRET`
   - `INSTAGRAM_REDIRECT_URI=https://api.justdms.in/auth/instagram/callback`

4. Request Advanced Access for:

   - `instagram_business_basic`
   - `instagram_business_manage_comments`
   - `instagram_business_manage_messages`

5. Run `migrations/20261003_add_instagram_login.sql` in the Supabase SQL
   Editor and redeploy the backend and frontend.

The account must be an Instagram Business or Creator account. Personal
Instagram accounts are not supported by Meta's professional APIs.
