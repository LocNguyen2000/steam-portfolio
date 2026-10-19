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
The Room Map Explorer game is stored as a published post with the exact slug
`pixel-game`. It appears in the Featured games & blogs slideshow alongside
published posts with the exact slug `game`; the game is displayed beside the
slideshow, while those other featured posts remain in it. Other posts remain
in the Gaming & blog collection. The local game card is shown as a fallback
until Supabase loads, or if the `pixel-game` post has not been added yet.

The site loads Supabase data over HTTP/HTTPS. Open it through a local web server
or its deployed URL instead of directly from `file://`.
