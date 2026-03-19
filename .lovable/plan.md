

## Issues Found

### 1. User Stats Showing Only 1
The marketing page queries the `profiles` table using the client-side connection. However, the `profiles` table RLS only allows "Users can view their own profile" — so the admin only sees their own row, resulting in count = 1. There is no admin SELECT policy on `profiles`.

### 2. Test Email Not Received
The RESEND_API_KEY is configured and the edge function logs confirm it attempted to send. The most likely cause is that the Resend `from` address (`noreply@criandomusicas.com.br`) requires a verified domain in Resend. If the domain isn't fully verified in the Resend dashboard, emails will silently fail. Additionally, the edge function doesn't log the Resend response on success, making it hard to debug.

---

## Plan

### Step 1: Add Admin SELECT Policy on Profiles
Create a database migration to add an RLS policy allowing admins to read all profiles:
```sql
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
```
This will fix the stats cards to show all 26 users.

### Step 2: Improve Edge Function Error Logging
Update `send-campaign-email/index.ts` to log the Resend response (success or error) after sending, so the admin can see what happened. Also log the full Resend result for the test email.

### Step 3: Add Fallback Error Feedback
Ensure the frontend properly surfaces any errors from the edge function (it already does via toast, but verify the error is propagated correctly).

---

### Technical Details
- The `profiles` table currently has 3 RLS policies (insert/update/select for own user only). Adding one admin SELECT policy solves the count issue.
- The edge function uses `resend.emails.send()` — if the domain `criandomusicas.com.br` isn't verified in Resend, it returns an error object. The current code only throws on `sendError` for test emails, which should work, but we should also log the raw response for debugging.

