-- DXB MUN portal database. Run ONCE in Supabase: SQL Editor > New query > paste all of this > Run.
-- Safe to run again later (it will not wipe your data). At the end it shows YOUR ADMIN CODE.
--
-- How it is locked down: every table lives in the "private" schema, which the public API cannot see.
-- The website can only call the functions below. Each one checks the caller's session token and role,
-- so a delegate can never do chair or admin things, and chits only reach recipients after the chair approves.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------- tables
create table if not exists private.committees (id text primary key, name text not null, sort int not null);
insert into private.committees (id, name, sort) values
 ('IPMC','Indian Prime Minister’s Cabinet',1),('HCC','Historic Crisis Committee',2),('IPC','International Press Corps',3),
 ('WHO','World Health Organization',4),('ECOSOC','Economic and Social Council',5),('AU','African Union',6),
 ('EU','European Union',7),('ICJ','International Court of Justice',8),
 ('DISEC','Disarmament and International Security Committee',9),('UNODC','United Nations Office on Drugs and Crime',10),
 ('UNEP','United Nations Environment Program',11),('UNOOSA','United Nations Office for Outer Space Affairs',12),
 ('UNSC','United Nations Security Council',13),('UNHRC','United Nations Human Rights Council',14),
 ('UNCSW','United Nations Commission on the Status of Women',15),
 ('UNCSTD','United Nations Commission on Science and Technology for Development',16),
 ('SOCHUM','Social, Humanitarian, and Cultural Committee',17),('INTERPOL','International Criminal Police Organization',18),
 ('NATO','North Atlantic Treaty Organization',19)
on conflict (id) do nothing;

create table if not exists private.users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin','chair','delegate','committee')),
  name text not null default '',
  delegation text,
  committee text references private.committees (id),
  code text not null,
  code_norm text not null unique,
  created_at timestamptz not null default now(),
  check (role = 'admin' or committee is not null),
  check (role <> 'delegate' or delegation is not null)
);
create unique index if not exists users_one_chair on private.users (committee) where role = 'chair';
create unique index if not exists users_delegation on private.users (committee, lower(delegation)) where role = 'delegate';
-- committee screens: one display account per committee (older installs are upgraded here)
alter table private.users drop constraint if exists users_role_check;
alter table private.users add constraint users_role_check check (role in ('admin','chair','delegate','committee'));
create unique index if not exists users_one_screen on private.users (committee) where role = 'committee';

create table if not exists private.sessions (
  token_hash bytea primary key,
  user_id uuid not null references private.users (id) on delete cascade,
  expires_at timestamptz not null
);
create table if not exists private.login_attempts (id bigserial primary key, ip text not null, at timestamptz not null default now());
create table if not exists private.chits (
  id uuid primary key default gen_random_uuid(),
  committee text not null,
  from_id uuid references private.users (id) on delete set null,
  to_id uuid references private.users (id) on delete set null,
  from_label text not null, to_label text not null,
  from_name text not null default '', to_name text not null default '',
  body text not null check (char_length(body) between 1 and 500),
  status text not null check (status in ('pending','delivered','rejected')),
  note text not null default '',
  reply_to uuid,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists chits_committee on private.chits (committee, status);
create index if not exists chits_to on private.chits (to_id);
create index if not exists chits_from on private.chits (from_id);

alter table private.committees enable row level security;
alter table private.users enable row level security;
alter table private.sessions enable row level security;
alter table private.login_attempts enable row level security;
alter table private.chits enable row level security;

-- ---------------------------------------------------------------- private helpers
create or replace function private.fail(msg text, code text) returns void language plpgsql set search_path = '' as
$$ begin raise exception '%', msg using errcode = code; end $$;

create or replace function private.norm(s text) returns text language sql immutable set search_path = '' as
$$ select upper(regexp_replace(coalesce(s, ''), '[^A-Za-z0-9]', '', 'g')) $$;

create or replace function private.clean(s text, n int) returns text language sql immutable set search_path = '' as
$$ select left(btrim(regexp_replace(coalesce(s, ''), '[\x01-\x1f\x7f]+', ' ', 'g')), n) $$;

create or replace function private.clean_text(s text, n int) returns text language sql immutable set search_path = '' as
$$ select left(btrim(regexp_replace(replace(replace(coalesce(s, ''), E'\r\n', E'\n'), E'\r', E'\n'), '[\x01-\x09\x0b-\x1f\x7f]', '', 'g'), E' \t\n'), n) $$;

create or replace function private.new_code(prefix text) returns text language plpgsql set search_path = '' as $$
declare alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; b bytea; s text; c text; i int;
begin
  loop
    b := extensions.gen_random_bytes(8); s := '';
    for i in 0..7 loop s := s || substr(alphabet, (get_byte(b, i) % length(alphabet)) + 1, 1); end loop;
    c := prefix || '-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
    exit when not exists (select 1 from private.users where code_norm = private.norm(c));
  end loop;
  return c;
end $$;

create or replace function private.me(p_token text) returns private.users language plpgsql set search_path = '' as $$
declare u private.users;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then perform private.fail('Please sign in', 'PT401'); end if;
  select x.* into u from private.sessions s join private.users x on x.id = s.user_id
   where s.token_hash = extensions.digest(p_token, 'sha256') and s.expires_at > now();
  if u.id is null then perform private.fail('Please sign in', 'PT401'); end if;
  return u;
end $$;

create or replace function private.need(u private.users, r text) returns void language plpgsql set search_path = '' as $$
begin if u.role <> r then perform private.fail('Not allowed', 'PT403'); end if; end $$;

create or replace function private.pub(u private.users) returns jsonb language sql set search_path = '' as
$$ select jsonb_build_object('id', u.id, 'role', u.role, 'name', u.name, 'committee', u.committee, 'delegation', u.delegation) $$;

create or replace function private.committee_json(cid text) returns jsonb language sql set search_path = '' as
$$ select jsonb_build_object('id', c.id, 'name', c.name) from private.committees c where c.id = cid $$;

create or replace function private.label(u private.users) returns text language sql set search_path = '' as
$$ select case when u.role = 'chair' then 'Chair' else u.delegation end $$;

create or replace function private.ms(t timestamptz) returns bigint language sql immutable set search_path = '' as
$$ select (extract(epoch from t) * 1000)::bigint $$;

create or replace function private.chit_view(c private.chits, with_names boolean) returns jsonb language sql set search_path = '' as
$$ select jsonb_build_object('id', c.id, 'committee', c.committee, 'fromId', c.from_id, 'toId', c.to_id, 'from', c.from_label,
         'to', c.to_label, 'text', c.body, 'status', c.status, 'note', c.note, 'createdAt', private.ms(c.created_at),
         'decidedAt', private.ms(c.decided_at), 'replyTo', c.reply_to)
      || case when with_names then jsonb_build_object('fromName', c.from_name, 'toName', c.to_name) else '{}'::jsonb end $$;

create or replace function private.add_delegate(p_committee text, p_delegation text, p_name text) returns jsonb language plpgsql set search_path = '' as $$
declare d text := private.clean(p_delegation, 60); nm text := private.clean(p_name, 80); u private.users; c text;
begin
  if not exists (select 1 from private.committees where id = p_committee) then return jsonb_build_object('status', 400, 'error', 'Unknown committee'); end if;
  if d = '' then return jsonb_build_object('status', 400, 'error', 'Delegation is required'); end if;
  if exists (select 1 from private.users where role = 'delegate' and committee = p_committee and lower(delegation) = lower(d)) then
    return jsonb_build_object('status', 409, 'error', d || ' already exists in ' || p_committee);
  end if;
  c := private.new_code('DEL');
  insert into private.users (role, name, delegation, committee, code, code_norm) values ('delegate', nm, d, p_committee, c, private.norm(c)) returning * into u;
  return jsonb_build_object('status', 201, 'user', jsonb_build_object('id', u.id, 'name', u.name, 'delegation', u.delegation, 'code', u.code));
end $$;

-- ---------------------------------------------------------------- sign in / out
create or replace function public.login(p_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ip text; n int; u private.users; tok text; c text := private.norm(p_code);
begin
  v_ip := coalesce(nullif(split_part(coalesce(current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for', ''), ',', 1), ''), 'unknown');
  delete from private.login_attempts where at < now() - interval '1 hour';
  select count(*) into n from private.login_attempts where private.login_attempts.ip = v_ip and at > now() - interval '10 minutes';
  if n >= 10 then perform private.fail('Too many wrong codes. Wait a few minutes and try again.', 'PT429'); end if;
  if length(c) >= 6 then select * into u from private.users where code_norm = c; end if;
  if u.id is null then
    insert into private.login_attempts (ip) values (v_ip);
    return jsonb_build_object('error', 'That code was not recognised. Check it and try again.');
  end if;
  delete from private.login_attempts where private.login_attempts.ip = v_ip;
  delete from private.sessions where expires_at < now();
  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into private.sessions (token_hash, user_id, expires_at) values (extensions.digest(tok, 'sha256'), u.id, now() + interval '7 days');
  return jsonb_build_object('token', tok, 'user', private.pub(u), 'committee', private.committee_json(u.committee));
end $$;

create or replace function public.logout(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_token ~ '^[a-f0-9]{64}$' then delete from private.sessions where token_hash = extensions.digest(p_token, 'sha256'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.me(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token);
begin return jsonb_build_object('user', private.pub(u), 'committee', private.committee_json(u.committee)); end $$;

-- ---------------------------------------------------------------- delegates
create or replace function public.delegate_roster(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token); ch uuid;
begin
  perform private.need(u, 'delegate');
  select id into ch from private.users where role = 'chair' and committee = u.committee;
  return jsonb_build_object(
    'delegations', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'delegation', d.delegation) order by lower(d.delegation))
                             from private.users d where d.role = 'delegate' and d.committee = u.committee and d.id <> u.id), '[]'::jsonb),
    'chair', case when ch is null then null else jsonb_build_object('id', ch) end);
end $$;

create or replace function public.my_chits(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token);
begin
  perform private.need(u, 'delegate');
  return jsonb_build_object(
    'inbox', coalesce((select jsonb_agg(private.chit_view(c, false) order by c.created_at desc) from private.chits c where c.to_id = u.id and c.status = 'delivered'), '[]'::jsonb),
    'sent',  coalesce((select jsonb_agg(private.chit_view(c, false) order by c.created_at desc) from private.chits c where c.from_id = u.id), '[]'::jsonb));
end $$;

create or replace function public.send_chit(p_token text, p_to uuid, p_text text, p_reply_to uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token); t private.users; txt text; n int; rt uuid; orig private.chits; ch private.chits;
begin
  perform private.need(u, 'delegate');
  select * into t from private.users where id = p_to;
  if t.id is null or t.id = u.id or t.committee is distinct from u.committee or t.role not in ('delegate', 'chair') then
    perform private.fail('Pick a delegation in your committee.', 'PT400');
  end if;
  txt := private.clean_text(p_text, 500);
  if txt = '' then perform private.fail('Write a message first.', 'PT400'); end if;
  select count(*) into n from private.chits where from_id = u.id and status = 'pending';
  if n >= 20 then perform private.fail('You have 20 chits waiting for the chair already. Wait for some to be cleared.', 'PT429'); end if;
  if p_reply_to is not null then
    select * into orig from private.chits where id = p_reply_to;
    if orig.id is not null and orig.to_id = u.id and orig.from_id = t.id then rt := orig.id; end if;
  end if;
  insert into private.chits (committee, from_id, to_id, from_label, to_label, from_name, to_name, body, status, decided_at, reply_to)
  values (u.committee, u.id, t.id, private.label(u), private.label(t), u.name, t.name, txt,
          case when t.role = 'chair' then 'delivered' else 'pending' end, case when t.role = 'chair' then now() end, rt)
  returning * into ch;
  return jsonb_build_object('chit', private.chit_view(ch, false));
end $$;

-- ---------------------------------------------------------------- chairs
create or replace function public.chair_chits(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token);
begin
  perform private.need(u, 'chair');
  return jsonb_build_object(
    'pending', coalesce((select jsonb_agg(private.chit_view(c, true) order by c.created_at asc) from private.chits c where c.committee = u.committee and c.status = 'pending'), '[]'::jsonb),
    'toChair', coalesce((select jsonb_agg(private.chit_view(c, true) order by c.created_at desc) from private.chits c where c.committee = u.committee and c.to_id = u.id), '[]'::jsonb),
    'log',     coalesce((select jsonb_agg(private.chit_view(c, true) order by c.created_at desc) from private.chits c where c.committee = u.committee and c.status <> 'pending' and c.to_id is distinct from u.id), '[]'::jsonb));
end $$;

create or replace function public.chair_decide(p_token text, p_id uuid, p_action text, p_note text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token); c private.chits;
begin
  perform private.need(u, 'chair');
  select * into c from private.chits where id = p_id and committee = u.committee for update;
  if c.id is null then perform private.fail('Chit not found', 'PT404'); end if;
  if c.status <> 'pending' then perform private.fail('This chit was already handled.', 'PT409'); end if;
  if p_action = 'approve' then
    if c.to_id is null then perform private.fail('The recipient has been removed from the committee.', 'PT409'); end if;
    update private.chits set status = 'delivered', decided_at = now() where id = c.id returning * into c;
  elsif p_action = 'reject' then
    update private.chits set status = 'rejected', note = private.clean(p_note, 200), decided_at = now() where id = c.id returning * into c;
  else
    perform private.fail('Unknown action', 'PT400');
  end if;
  return jsonb_build_object('chit', private.chit_view(c, true));
end $$;

create or replace function public.chair_roster(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token);
begin
  perform private.need(u, 'chair');
  return jsonb_build_object('delegates', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'delegation', d.delegation, 'name', d.name) order by lower(d.delegation))
                             from private.users d where d.role = 'delegate' and d.committee = u.committee), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- admin
create or replace function public.admin_overview(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token);
begin
  perform private.need(u, 'admin');
  return jsonb_build_object(
    'committees', coalesce((select jsonb_agg(jsonb_build_object('id', cm.id, 'name', cm.name,
        'chair', (select jsonb_build_object('id', ch.id, 'name', ch.name, 'code', ch.code) from private.users ch where ch.role = 'chair' and ch.committee = cm.id),
        'screen', (select jsonb_build_object('id', s.id, 'code', s.code) from private.users s where s.role = 'committee' and s.committee = cm.id),
        'delegates', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'delegation', d.delegation, 'code', d.code) order by lower(d.delegation))
                               from private.users d where d.role = 'delegate' and d.committee = cm.id), '[]'::jsonb)) order by cm.sort)
      from private.committees cm), '[]'::jsonb),
    'stats', jsonb_build_object(
        'delegates', (select count(*) from private.users where role = 'delegate'),
        'chairs', (select count(*) from private.users where role = 'chair'),
        'chits', (select count(*) from private.chits),
        'pending', (select count(*) from private.chits where status = 'pending')));
end $$;

create or replace function public.admin_add_delegate(p_token text, p_committee text, p_delegation text, p_name text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token); r jsonb;
begin
  perform private.need(u, 'admin');
  r := private.add_delegate(p_committee, p_delegation, p_name);
  if (r ->> 'status')::int <> 201 then perform private.fail(r ->> 'error', 'PT' || (r ->> 'status')); end if;
  return jsonb_build_object('delegate', r -> 'user');
end $$;

create or replace function public.admin_bulk_add(p_token text, p_committee text, p_lines text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token); r jsonb; line text; parts text[]; created jsonb := '[]'::jsonb; skipped jsonb := '[]'::jsonb;
begin
  perform private.need(u, 'admin');
  if not exists (select 1 from private.committees where id = p_committee) then perform private.fail('Unknown committee', 'PT400'); end if;
  for line in select l from regexp_split_to_table(coalesce(p_lines, ''), E'\r?\n') as l limit 300 loop
    if btrim(line) = '' then continue; end if;
    parts := regexp_split_to_array(btrim(line), E'\\s*[|\\t,]\\s*');
    r := private.add_delegate(p_committee, parts[1], array_to_string(parts[2:array_upper(parts, 1)], ' '));
    if (r ->> 'status')::int = 201 then
      created := created || jsonb_build_object('delegation', r -> 'user' ->> 'delegation', 'name', r -> 'user' ->> 'name', 'code', r -> 'user' ->> 'code');
    else
      skipped := skipped || jsonb_build_object('line', left(btrim(line), 80), 'reason', r ->> 'error');
    end if;
  end loop;
  return jsonb_build_object('created', created, 'skipped', skipped);
end $$;

create or replace function public.admin_add_chair(p_token text, p_committee text, p_name text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token); c text; ch private.users;
begin
  perform private.need(u, 'admin');
  if not exists (select 1 from private.committees where id = p_committee) then perform private.fail('Unknown committee', 'PT400'); end if;
  if exists (select 1 from private.users where role = 'chair' and committee = p_committee) then perform private.fail(p_committee || ' already has a chair', 'PT409'); end if;
  c := private.new_code('CHR');
  insert into private.users (role, name, committee, code, code_norm) values ('chair', private.clean(p_name, 80), p_committee, c, private.norm(c)) returning * into ch;
  return jsonb_build_object('chair', jsonb_build_object('id', ch.id, 'name', ch.name, 'code', ch.code));
end $$;

create or replace function public.admin_update_user(p_token text, p_id uuid, p_name text default null, p_delegation text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token); t private.users; d text;
begin
  perform private.need(u, 'admin');
  select * into t from private.users where id = p_id;
  if t.id is null or t.role = 'admin' then perform private.fail('Account not found', 'PT404'); end if;
  if p_delegation is not null and t.role = 'delegate' then
    d := private.clean(p_delegation, 60);
    if d = '' then perform private.fail('Delegation is required', 'PT400'); end if;
    if exists (select 1 from private.users where id <> t.id and role = 'delegate' and committee = t.committee and lower(delegation) = lower(d)) then
      perform private.fail(d || ' already exists in ' || t.committee, 'PT409');
    end if;
    update private.users set delegation = d where id = t.id;
  end if;
  if p_name is not null then update private.users set name = private.clean(p_name, 80) where id = t.id; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_delete_user(p_token text, p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token);
begin
  perform private.need(u, 'admin');
  if not exists (select 1 from private.users where id = p_id and role <> 'admin') then perform private.fail('Account not found', 'PT404'); end if;
  if exists (select 1 from private.users where id = p_id and role = 'committee') then perform private.fail('The committee screen is removed together with its committee.', 'PT409'); end if;
  delete from private.users where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_reset_code(p_token text, p_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token); t private.users; c text;
begin
  perform private.need(u, 'admin');
  select * into t from private.users where id = p_id;
  if t.id is null or t.role = 'admin' then perform private.fail('Account not found', 'PT404'); end if;
  c := private.new_code(case when t.role = 'chair' then 'CHR' when t.role = 'committee' then 'COM' else 'DEL' end);
  update private.users set code = c, code_norm = private.norm(c) where id = t.id;
  delete from private.sessions where user_id = t.id;
  return jsonb_build_object('code', c);
end $$;

create or replace function public.admin_chits(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token);
begin
  perform private.need(u, 'admin');
  return jsonb_build_object('chits', coalesce((select jsonb_agg(private.chit_view(x, true) order by x.created_at desc)
          from (select * from private.chits order by created_at desc limit 300) x), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------- committees and their screens
create or replace function public.admin_add_committee(p_token text, p_id text, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token); cid text := upper(regexp_replace(coalesce(p_id, ''), '[^A-Za-z0-9-]', '', 'g')); nm text := private.clean(p_name, 100); c text;
begin
  perform private.need(u, 'admin');
  if length(cid) < 2 or length(cid) > 12 then perform private.fail('Use a short acronym of 2 to 12 letters or numbers (for example UNSC).', 'PT400'); end if;
  if nm = '' then perform private.fail('Enter the full committee name.', 'PT400'); end if;
  if exists (select 1 from private.committees where id = cid) then perform private.fail(cid || ' already exists.', 'PT409'); end if;
  insert into private.committees (id, name, sort) values (cid, nm, coalesce((select max(sort) from private.committees), 0) + 1);
  c := private.new_code('COM');
  insert into private.users (role, name, committee, code, code_norm) values ('committee', nm, cid, c, private.norm(c));
  return jsonb_build_object('committee', jsonb_build_object('id', cid, 'name', nm), 'screen', jsonb_build_object('code', c));
end $$;

create or replace function public.admin_remove_committee(p_token text, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token);
begin
  perform private.need(u, 'admin');
  if not exists (select 1 from private.committees where id = p_id) then perform private.fail('Committee not found', 'PT404'); end if;
  delete from private.chits where committee = p_id;
  delete from private.users where committee = p_id;   -- chair, delegates and the screen (their sessions go with them)
  delete from private.committees where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.committee_screen(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u private.users := private.me(p_token);
begin
  perform private.need(u, 'committee');
  return jsonb_build_object(
    'committee', private.committee_json(u.committee),
    'chair', (select nullif(ch.name, '') from private.users ch where ch.role = 'chair' and ch.committee = u.committee),
    'delegations', coalesce((select jsonb_agg(d.delegation order by lower(d.delegation)) from private.users d where d.role = 'delegate' and d.committee = u.committee), '[]'::jsonb));
end $$;

grant execute on function public.admin_add_committee(text, text, text), public.admin_remove_committee(text, text), public.committee_screen(text) to anon, authenticated;

-- ---------------------------------------------------------------- permissions
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function public.login(text), public.logout(text), public.me(text), public.delegate_roster(text), public.my_chits(text),
  public.send_chit(text, uuid, text, uuid), public.chair_chits(text), public.chair_decide(text, uuid, text, text), public.chair_roster(text),
  public.admin_overview(text), public.admin_add_delegate(text, text, text, text), public.admin_bulk_add(text, text, text),
  public.admin_add_chair(text, text, text), public.admin_update_user(text, uuid, text, text), public.admin_delete_user(text, uuid),
  public.admin_reset_code(text, uuid), public.admin_chits(text) to anon, authenticated;

-- every committee gets a screen account (this also upgrades older installs)
do $$
declare cm record; c text;
begin
  for cm in select k.id, k.name from private.committees k
            where not exists (select 1 from private.users u where u.role = 'committee' and u.committee = k.id) loop
    c := private.new_code('COM');
    insert into private.users (role, name, committee, code, code_norm) values ('committee', cm.name, cm.id, c, private.norm(c));
  end loop;
end $$;

-- ---------------------------------------------------------------- your admin account (created once)
insert into private.users (role, name, code, code_norm)
select 'admin', 'Admin', c, private.norm(c) from (select private.new_code('ADM') as c) x
where not exists (select 1 from private.users where role = 'admin');

select code as "YOUR ADMIN CODE - save it somewhere safe" from private.users where role = 'admin';
