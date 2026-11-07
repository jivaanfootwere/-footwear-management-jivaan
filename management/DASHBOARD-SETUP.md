# JIVAAN Footwear Management Dashboard

A new online dashboard has been added at `/management/dashboard.html`. The existing public marketing website and offline pilot file have not been overwritten.

## Connect it to Supabase

1. Open Supabase project: https://supabase.com/dashboard/project/yqgoebdtujjiyxclmbyr
2. Open SQL Editor, create a new query, paste all of `schema.sql`, and run it.
3. In Project Settings > API, copy the Project URL and the publishable key (or legacy anon key). Never use the service_role/secret key in a browser.
4. Open `dashboard.html` in GitHub and edit the CONFIG object near the bottom:
   - SUPABASE_URL = your project URL
   - SUPABASE_ANON_KEY = your publishable/anon key
5. Save the change. Open the GitHub Pages URL ending in `/management/dashboard.html`.
6. In Supabase Authentication, create the first user with email and password.
7. In Supabase SQL Editor, promote that user to admin (replace the email):
   ```sql
   update public.profiles
   set role='admin', active=true, full_name='JIVAAN Admin'
   where user_id=(select id from auth.users where email='YOUR_EMAIL_HERE');
   ```
8. Sign in. Create an event, then stands and bags. Staff users created in Authentication receive the staff role automatically. Admin can promote them by editing their row in public.profiles.

## Current functionality

- Secure email/password sign-in using Supabase Auth.
- Admin/supervisor event creation and status management.
- Stand and bag inventory creation.
- Staff deposit creation with unique token ID and QR.
- Token verification and footwear return.
- Database-backed event, bag and deposit records.
- Realtime refresh across connected dashboard sessions.
- Searchable records and CSV export.
- Camera QR scan where browser camera permission and HTTPS are available.

## WhatsApp

WhatsApp access tokens must remain in Supabase Edge Function secrets. The existing `send-footwear-token` Edge Function expects a matching approved template named `jivaan_footwear_token` (or configured template name), with an image header and three body parameters. Meta app publication, template approval, permissions and business messaging setup are not confirmed yet. The current dashboard shares token details through the phone's share sheet; it does not yet call the WhatsApp Edge Function. Do not assume automated WhatsApp sending is active.

## Important before live events

This is an initial build, not yet a production-audited system. Test with sample bags and multiple devices. Add supervisor recovery controls, staff assignment enforcement, photo capture/consent, QR payload signing, webhook delivery logging and end-to-end WhatsApp sending before relying on it at a high-volume event. Never return footwear based only on an expired token; physically verify the customer and item.
