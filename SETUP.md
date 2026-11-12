# DXB MUN portal: one-time setup (Supabase + Vercel)

Nothing here needs a server of your own. Supabase stores the accounts and chits. Vercel hosts the website.

## 1. Supabase (the database)
1. Go to supabase.com, sign in, click **New project** (any name, pick a region near Dubai, save the database password somewhere).
2. When it finishes, open **SQL Editor > New query**.
3. Open `supabase/setup.sql` from this folder, copy ALL of it, paste it into the editor and click **Run**.
4. The result panel shows **YOUR ADMIN CODE**. Copy it and keep it safe. This is how you sign in as admin.
   (Lost it? Run `select code from private.users where role = 'admin';` in the SQL Editor.)
5. Open **Project Settings > API** and copy two things: the **Project URL** and the **publishable key** (older projects call it the **anon** key).
6. Paste them into `js/config.js` (replace the two PASTE_... values). NEVER paste a "secret" or "service_role" key anywhere.

## 2. Vercel (the website)
1. Put this folder on GitHub (GitKraken: publish the repository; private is fine).
2. On vercel.com choose **Add New > Project**, import that repository, and click **Deploy** (no settings to change).
3. Open the Vercel link, go to `/login.html`, and sign in with your admin code.

## 3. Using it
- Admin: pick a committee, create its chair, add delegates (one by one or pasted in bulk). Each person gets an access code.
  Use **Download all codes (CSV)** to hand them out. Keep that file private.
- Delegates and chairs sign in at `/login.html` with their own code and land on their own dashboard. Sign-in is kept per browser tab, so you can test different roles in separate tabs.
- A chit goes: delegate -> their chair (approves or rejects) -> recipient delegation.
- Chair: issue a **Crisis alert** to show an animated, committee-wide update on the room screen and delegate dashboards. It remains active until the chair ends it.

Every time you change the website files, push to GitHub and Vercel redeploys by itself.

## Updating later
When a new version of `supabase/setup.sql` comes with an update (for example, committees and committee screens), paste the whole file into Supabase SQL Editor and click Run again. It is safe: it keeps all your existing data and only adds what is new.
