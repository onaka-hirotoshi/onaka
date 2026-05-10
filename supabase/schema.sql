-- Supabase 用のテーブル + RLS ポリシー
-- ダッシュボードの SQL Editor で実行してください

create table if not exists public.tweets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_email text,
  content text not null check (char_length(content) between 1 and 280),
  created_at timestamptz not null default now()
);

create index if not exists tweets_created_at_idx
  on public.tweets (created_at desc);

alter table public.tweets enable row level security;

-- 既存ポリシーがあれば作り直し
drop policy if exists "tweets_select_all" on public.tweets;
drop policy if exists "tweets_insert_own" on public.tweets;
drop policy if exists "tweets_update_own" on public.tweets;
drop policy if exists "tweets_delete_own" on public.tweets;

-- 誰でも読める（匿名でも閲覧可。閲覧もログイン必須にしたいなら to authenticated に変更）
create policy "tweets_select_all"
  on public.tweets for select
  using (true);

-- 自分の user_id でしか投稿できない
create policy "tweets_insert_own"
  on public.tweets for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 自分の投稿だけ更新・削除可
create policy "tweets_update_own"
  on public.tweets for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tweets_delete_own"
  on public.tweets for delete
  to authenticated
  using (auth.uid() = user_id);

-- リアルタイム購読を有効化（フィードの自動更新で使う）
alter publication supabase_realtime add table public.tweets;
