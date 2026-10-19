create table if not exists public.posts (
  id text primary key,
  content_type text not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  summary text not null default '',
  slug text unique,
  published_at date,
  body text not null default '',
  image_url text,
  tags text[] not null default '{}',
  card_class text not null default '',
  link_label text,
  link_url text,
  link_new_tab boolean not null default false,
  sort_order integer not null unique,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_link_pair check (
    (link_label is null and link_url is null)
    or (link_label is not null and link_url is not null)
  )
);

alter table public.posts enable row level security;

revoke all on table public.posts from public, anon, authenticated;
grant select on table public.posts to anon;

drop policy if exists "Anyone can read published posts" on public.posts;
create policy "Anyone can read published posts"
  on public.posts
  for select
  to anon
  using (is_published = true);

insert into public.posts (
  id,
  content_type,
  title,
  summary,
  slug,
  published_at,
  body,
  image_url,
  tags,
  card_class,
  link_label,
  link_url,
  link_new_tab,
  sort_order,
  is_published
)
values
  (
    'tower-defense',
    'BROWSER GAME',
    'Tower Defense',
    'My old gaming project, a simple tower defense game built with HTML5 Canvas, converted from JavaFX game.',
    null,
    null,
    '',
    './images/blog-game-tdf.png',
    array['Strategy', 'Canvas'],
    'content-tower-defense',
    'Play game',
    './game-js/index.html',
    true,
    1,
    true
  ),
  (
    'chess-game',
    'GAMING',
    'Chess Game',
    'Just a normal game of chess, nothing special.',
    null,
    null,
    '',
    './images/blog-chess.png',
    array['Chess', 'Gaming'],
    'content-chess',
    'View game',
    'https://www.chess.com/game/live/185410153140?username=locnguyen2k',
    true,
    2,
    true
  ),
  (
    'gaming-content',
    'GAMING VIDEO',
    'Gaming Content',
    'A game of Rematch, bought on Steam and played with my friends.',
    null,
    null,
    '',
    './images/blog-game.png',
    array['Gaming', 'YouTube'],
    'content-gaming',
    'Watch on YouTube',
    'https://www.youtube.com/watch?v=VwIL-JUw7Uc',
    true,
    3,
    true
  ),
  (
    'badminton-video',
    'VIDEO',
    'Badminton Video',
    'I''m bad at badminton! Yes i said it.',
    null,
    null,
    '',
    './images/blog-badminton.png',
    array['Badminton', 'Video'],
    'content-badminton',
    'Watch on YouTube',
    'https://www.youtube.com/watch?v=s_Mj4oaLRSg',
    true,
    4,
    true
  ),
  (
    'code-blog',
    'BLOG',
    'Code Blog',
    'Notes and posts about software development and coding.',
    'code-blog',
    null,
    '',
    null,
    array['Software', 'Writing'],
    'content-code',
    null,
    null,
    false,
    5,
    true
  ),
  (
    'pixel-game',
    'PIXEL GAME',
    'Room Map Explorer',
    'Explore my pixel-art room and inspect the objects around it.',
    'pixel-game',
    null,
    '',
    './images/blog-game-pixel.png',
    array['Pixel art', 'Explore'],
    '',
    'Play game',
    './game-pixel/index.html',
    false,
    6,
    true
  )
on conflict (id) do nothing;
