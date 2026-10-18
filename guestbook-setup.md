# Guest book setup

The guest book uses Supabase so messages can be shared between visitors on both
pages.

1. Create a Supabase project.
2. Open the project's SQL Editor and run [`supabase/guestbook.sql`](./supabase/guestbook.sql).
3. Run [`supabase/posts.sql`](./supabase/posts.sql) to create the read-only posts table and migrate the existing Gaming page cards.
4. Copy the project URL and its publishable (anon) key from the API settings into
   [`guestbook-config.js`](./guestbook-config.js).
5. Serve or deploy the site over HTTP/HTTPS and test submitting a message.

The publishable key is intended for browser use. Never put a `service_role` or
secret key in this site. Row-level security allows visitors to read and add
entries but not edit or delete them. Manage unwanted entries from the Supabase
dashboard. The public insert endpoint does not include CAPTCHA or rate limiting;
add server-side spam protection before using it for a high-traffic site.

The posts table is read-only to anonymous visitors; manage and publish posts from
the Supabase dashboard.
