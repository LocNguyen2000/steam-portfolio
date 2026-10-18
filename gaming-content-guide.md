# Gaming and blog content

The intro and collection heading are editable directly in [`gaming.html`](./gaming.html).
The published cards and blog entries are loaded from the Supabase `posts` table.

Create the table and migrate the existing Gaming page cards by running
[`supabase/posts.sql`](./supabase/posts.sql) in the Supabase SQL Editor. To add
or edit posts after migration, use the Supabase dashboard (the public website
has read-only access).

The `posts` table stores content type, title, summary, image, tags, card style,
optional link, stable slug, publication date, full body, and display order.
Set `is_published` to `false` to keep a draft out of the public page.

The site loads Supabase data over HTTP/HTTPS. Open it through a local web server
or its deployed URL instead of directly from `file://`.
