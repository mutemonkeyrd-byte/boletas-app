-- Migration: PDF tickets feature
-- Run this ONCE in Supabase SQL Editor after deploying the code update

-- 1. Add column for PDF URL
alter table public.qr_codes add column if not exists ticket_pdf_url text;

-- 2. Create public bucket for ticket PDFs
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', true)
on conflict (id) do nothing;

-- 3. Storage policies for tickets bucket
do $$ begin
  drop policy if exists "admin upload tickets" on storage.objects;
  drop policy if exists "admin update tickets" on storage.objects;
  drop policy if exists "public read tickets" on storage.objects;
exception when others then null; end $$;

create policy "admin upload tickets" on storage.objects for insert
  with check (bucket_id = 'tickets' and public.get_my_rol() = 'admin');

create policy "admin update tickets" on storage.objects for update
  using (bucket_id = 'tickets' and public.get_my_rol() = 'admin');

create policy "public read tickets" on storage.objects for select
  using (bucket_id = 'tickets');
