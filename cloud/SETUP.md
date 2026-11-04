# JIVAAN Cloud setup

The cloud dashboard is at https://jivaanfootwere.github.io/-footwear-management-jivaan/cloud/ . The previous /management/ page is local-only. Do not use it for live multi-device events.

## Setup steps
1. Sign in at https://supabase.com/dashboard and create a project on the Free plan. Keep the database password private.
2. Open SQL Editor, create a query, copy all of supabase/schema.sql from this repository, paste it, and run it.
3. Open Authentication > Users and sign up with jivaanhq@gmail.com through the app. The database trigger assigns that exact email the admin role. Use a strong password.
4. Open Project Settings > API Keys. Copy the Project URL and the publishable key (or legacy anon key). Never use a secret/service_role key.
5. Open the cloud dashboard URL above, paste the Project URL and publishable/anon key, connect, and sign in.
6. New staff accounts are pending until an admin approves them. Approve only trusted staff by changing their role in public.profiles to staff or supervisor using Supabase SQL Editor.
7. Test one bag on two devices before a live event. Confirm deposit, return, expiry handling and supervisor recovery.

## Included
- 200 bags A1-A50, B1-B50, C1-C50, D1-D50.
- Permanent QR scanner input, cloud-side atomic bag allocation, token image, 12-hour expiry, return check, supervisor recovery, live refresh and CSV report.
- RLS enabled on all public tables. Database functions enforce role checks.

## Not yet activated
- Automatic WhatsApp sending is not included. The current share button opens the Android share sheet so staff can choose WhatsApp and send manually. Official Meta WhatsApp Cloud API setup is separate and may incur message charges.
- The cloud system is not live until you create the Supabase project, run the SQL, and connect its Project URL and publishable key.
