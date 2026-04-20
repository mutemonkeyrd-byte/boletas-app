-- BoletasApp v3 — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query

create extension if not exists "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users on delete cascade,
  nombre_completo text not null,
  telefono        text,
  rol             text not null default 'vendedor' check (rol in ('admin','vendedor')),
  estado          text not null default 'pendiente' check (estado in ('pendiente','aprobado','rechazado')),
  created_at      timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nombre_completo)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre_completo', 'Usuario'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── EVENTOS ───────────────────────────────────────────────
create table public.eventos (
  id                 uuid primary key default uuid_generate_v4(),
  nombre             text not null,
  fecha_evento       date,
  venue              text,
  precio_boleta      integer not null default 0,
  comision_tipo      text default 'fijo' check (comision_tipo in ('fijo','porcentaje')),
  comision_valor     numeric default 0,
  estado             text not null default 'activo' check (estado in ('activo','cerrado','borrador')),
  cuentas_bancarias  jsonb default '[]',
  created_by         uuid references public.profiles(id),
  created_at         timestamptz default now()
);

-- ── QR CODES ──────────────────────────────────────────────
create table public.qr_codes (
  id               uuid primary key default uuid_generate_v4(),
  evento_id        uuid not null references public.eventos(id) on delete cascade,
  qr_id            text not null,
  qr_image_url     text,
  estado           text not null default 'bloqueado' check (estado in ('bloqueado','desbloqueado','vendido','entregado')),
  vendedor_id      uuid references public.profiles(id),
  vendedor_nombre  text,
  fecha_desbloqueo timestamptz,
  created_at       timestamptz default now(),
  unique (evento_id, qr_id)
);

-- ── PAGOS ─────────────────────────────────────────────────
create table public.pagos (
  id               uuid primary key default uuid_generate_v4(),
  evento_id        uuid not null references public.eventos(id),
  vendedor_id      uuid not null references public.profiles(id),
  vendedor_nombre  text,
  qr_ids           text[],
  monto            integer not null,
  banco_destino    text not null,
  comprobante_url  text,
  estado           text not null default 'pendiente' check (estado in ('pendiente','aprobado','rechazado')),
  notas_admin      text,
  revisado_por     uuid references public.profiles(id),
  fecha_reporte    timestamptz default now(),
  fecha_revision   timestamptz
);

-- ── RLS ───────────────────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.eventos   enable row level security;
alter table public.qr_codes  enable row level security;
alter table public.pagos     enable row level security;

create or replace function public.get_my_rol()
returns text as $$ select rol from public.profiles where id = auth.uid(); $$ language sql security definer;

-- Profiles
create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "admin all profiles" on public.profiles for select using (get_my_rol() = 'admin');
create policy "admin update profiles" on public.profiles for update using (get_my_rol() = 'admin');
create policy "user update own" on public.profiles for update using (auth.uid() = id);
create policy "insert profiles" on public.profiles for insert with check (true);

-- Eventos
create policy "admin all eventos" on public.eventos for all using (get_my_rol() = 'admin');
create policy "vendor see active eventos" on public.eventos for select using (get_my_rol() = 'vendedor' and estado = 'activo');

-- QR Codes
create policy "admin all qr" on public.qr_codes for all using (get_my_rol() = 'admin');
create policy "vendor see own qr" on public.qr_codes for select using (get_my_rol() = 'vendedor' and vendedor_id = auth.uid());
create policy "vendor update own qr" on public.qr_codes for update using (get_my_rol() = 'vendedor' and vendedor_id = auth.uid());

-- Pagos
create policy "admin all pagos" on public.pagos for all using (get_my_rol() = 'admin');
create policy "vendor see own pagos" on public.pagos for select using (get_my_rol() = 'vendedor' and vendedor_id = auth.uid());
create policy "vendor insert own pagos" on public.pagos for insert with check (get_my_rol() = 'vendedor' and vendedor_id = auth.uid());

-- ── STORAGE BUCKETS ───────────────────────────────────────
insert into storage.buckets (id, name, public) values ('comprobantes', 'comprobantes', false) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('qr-images', 'qr-images', true) on conflict do nothing;

create policy "vendor upload comprobantes" on storage.objects for insert
  with check (bucket_id = 'comprobantes' and auth.uid()::text = (storage.foldername(name))[2]);
create policy "vendor read own comprobantes" on storage.objects for select
  using (bucket_id = 'comprobantes' and auth.uid()::text = (storage.foldername(name))[2]);
create policy "admin read all comprobantes" on storage.objects for select
  using (bucket_id = 'comprobantes' and get_my_rol() = 'admin');
create policy "admin upload qr images" on storage.objects for insert
  with check (bucket_id = 'qr-images' and get_my_rol() = 'admin');
create policy "public read qr images" on storage.objects for select
  using (bucket_id = 'qr-images');

-- ── MAKE YOURSELF ADMIN ───────────────────────────────────
-- After signing up with your email, run this:
-- update public.profiles set rol = 'admin', estado = 'aprobado'
-- where id = (select id from auth.users where email = 'TU@EMAIL.COM');
