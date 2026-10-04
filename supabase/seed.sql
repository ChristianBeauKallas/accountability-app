-- Athletx — Phase 2 seed data
--
-- ~10 programs (KS/OK/TX/MO), ~25 open needs, ~40 players, and a spread of
-- applications so the coach inbox and player feed are populated out of the box.
--
-- Demo login accounts (email magic-link OR password):
--   coach@seed.athletx     password: athletxdemo   (staffs Cowley College)
--   coach2@seed.athletx    password: athletxdemo   (staffs Washburn)
--   player1@seed.athletx … player40@seed.athletx    password: athletxdemo
--
-- Safe to re-run: clears seeded rows first.

-- ---------------------------------------------------------------------------
-- 0. Clean previous seed
-- ---------------------------------------------------------------------------
delete from auth.users where email like '%@seed.athletx';
delete from public.programs where name in (
  'Cowley College','Fort Scott Community College','Crowder College',
  'Emporia State University','Washburn University','Rogers State University',
  'Missouri Southern State University','University of Texas at Tyler',
  'MidAmerica Nazarene University','Oklahoma Wesleyan University'
);

-- ---------------------------------------------------------------------------
-- 1. Seed-user helper (creates auth.users + identity; profile via trigger)
-- ---------------------------------------------------------------------------
create or replace function public._seed_user(p_email text, p_name text, p_role text, p_pw text)
returns uuid language plpgsql security definer as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    p_email, crypt(p_pw, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_name, 'role', p_role),
    '', '', '', ''
  );
  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    uid::text, uid, jsonb_build_object('sub', uid::text, 'email', p_email), 'email',
    now(), now(), now()
  );
  return uid;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Programs
-- ---------------------------------------------------------------------------
insert into public.programs (name, division, city, state, lat, lng, conference, about) values
  ('Cowley College','JUCO','Arkansas City','KS',37.0620,-97.0384,'KJCCC','Perennial JUCO contender in south-central Kansas with a strong four-year transfer pipeline.'),
  ('Fort Scott Community College','JUCO','Fort Scott','KS',37.8403,-94.7083,'KJCCC','Eastern Kansas JUCO that develops pitching and middle-infield talent.'),
  ('Crowder College','JUCO','Neosho','MO',36.8690,-94.3677,'MCCAC','Southwest Missouri JUCO with a reputation for moving players to D1/D2 programs.'),
  ('Emporia State University','D2','Emporia','KS',38.4039,-96.1817,'MIAA','MIAA program in the Flint Hills, consistent regional qualifier.'),
  ('Washburn University','D2','Topeka','KS',39.0347,-95.6975,'MIAA','Division II program in the state capital with modern facilities.'),
  ('Rogers State University','D2','Claremore','OK',36.3126,-95.6161,'MIAA','Northeast Oklahoma D2 program on the rise in the MIAA.'),
  ('Missouri Southern State University','D2','Joplin','MO',37.0842,-94.5133,'MIAA','Four Corners D2 program drawing talent from four states.'),
  ('University of Texas at Tyler','D2','Tyler','TX',32.3513,-95.3011,'LSC','East Texas D2 in the competitive Lone Star Conference.'),
  ('MidAmerica Nazarene University','NAIA','Olathe','KS',38.8814,-94.8191,'Heart','Kansas City metro NAIA program in the Heart of America conference.'),
  ('Oklahoma Wesleyan University','NAIA','Bartlesville','OK',36.7473,-95.9808,'Sooner','NAIA program in northeast Oklahoma with national-tournament pedigree.');

-- ---------------------------------------------------------------------------
-- 3. Coaches + staffing
-- ---------------------------------------------------------------------------
do $$
declare c1 uuid; c2 uuid;
begin
  c1 := public._seed_user('coach@seed.athletx', 'Dillon Reyes', 'coach', 'athletxdemo');
  c2 := public._seed_user('coach2@seed.athletx', 'Marcus Hale', 'coach', 'athletxdemo');

  insert into public.program_staff (program_id, profile_id, staff_role)
  select id, c1, 'recruiting_coordinator' from public.programs where name = 'Cowley College';

  insert into public.program_staff (program_id, profile_id, staff_role)
  select id, c2, 'head' from public.programs where name = 'Washburn University';
end $$;

-- ---------------------------------------------------------------------------
-- 4. Needs (~25)
-- ---------------------------------------------------------------------------
insert into public.needs
  (program_id, title, positions, grad_year_min, grad_year_max, accepts_transfer,
   min_gpa, must_have, min_exit_velo, min_sixty, min_fastball_velo, min_pop_time, description, created_by)
select p.id, v.title, v.positions, v.gy_min, v.gy_max, v.transfer, v.min_gpa, v.must_have,
       v.min_ev, v.min_60, v.min_fb, v.min_pop, v.descr,
       (select ps.profile_id from public.program_staff ps where ps.program_id = p.id limit 1)
from (values
  -- program name, title, positions, gy_min, gy_max, transfer, min_gpa, must_have, min_ev, min_60, min_fb, min_pop, descr
  ('Cowley College','Catcher — strong arm', array['C'], 2026, 2027, true, 2.5, array['framing','pop time'], null, null, null, 2.00::numeric, 'Need a catcher who can control the run game. Pop under 2.0 preferred.'),
  ('Cowley College','RHP — mid-80s+', array['RHP'], 2026, 2027, true, 2.5, array['command'], null, null, 85, null, 'Looking for a right-handed starter sitting mid-80s with a usable breaking ball.'),
  ('Cowley College','Corner OF with pop', array['OF','RF'], 2026, 2027, false, 2.5, array['power'], 92, null, null, null, 'Corner outfielder who can drive the ball. Exit velo 92+.'),
  ('Cowley College','LHP — lefty specialist', array['LHP'], 2026, 2027, true, 2.5, array[]::text[], null, null, 82, null, 'Left-handed arm, deception over velocity.'),
  ('Fort Scott Community College','Middle IF — glove first', array['SS','2B'], 2026, 2027, false, 2.5, array['range','hands'], null, 6.90, null, null, 'Rangy middle infielder, actions over bat.'),
  ('Fort Scott Community College','LHP — projectable', array['LHP'], 2026, 2027, false, 2.5, array[]::text[], null, null, 80, null, 'Projectable lefty, room to add velocity.'),
  ('Crowder College','1B/3B — run producer', array['1B','3B'], 2026, 2027, true, 2.5, array['power'], 94, null, null, null, 'Corner infield bat with real power. Exit velo 94+.'),
  ('Crowder College','RHP — bullpen arm', array['RHP'], 2026, 2027, true, 2.5, array['strike thrower'], null, null, 86, null, 'Right-handed reliever who pounds the zone.'),
  ('Crowder College','Catcher — bat', array['C'], 2026, 2027, false, 2.5, array['bat'], 90, null, null, 2.10, 'Catcher who can hit and receive.'),
  ('Emporia State University','OF transfer — four year', array['OF','CF'], 2024, 2026, true, 2.75, array['speed'], null, 6.70, null, null, 'Transfer outfielder, center-field speed. Immediate impact.'),
  ('Emporia State University','RHP transfer — weekend starter', array['RHP'], 2024, 2026, true, 2.75, array['innings'], null, null, 88, null, 'Transfer arm to slot into the weekend rotation.'),
  ('Washburn University','SS — two-way actions', array['SS'], 2026, 2027, true, 2.75, array['hands','arm'], 88, 6.80, null, null, 'Shortstop with clean actions and an arm for the left side.'),
  ('Washburn University','Catcher — defense', array['C'], 2026, 2027, false, 2.75, array['framing'], null, null, null, 1.95, 'Defensive catcher, blocking and receiving first.'),
  ('Washburn University','LHP — weekend arm', array['LHP'], 2026, 2027, true, 2.75, array['command'], null, null, 84, null, 'Lefty starter with three pitches.'),
  ('Rogers State University','2B/SS — contact bat', array['2B','SS'], 2026, 2027, false, 2.5, array['contact'], null, 6.95, null, null, 'Middle-infield contact hitter who can run a little.'),
  ('Rogers State University','OF — leadoff type', array['OF','CF'], 2026, 2027, true, 2.5, array['speed','obp'], null, 6.75, null, null, 'Top-of-the-order outfielder, gets on and goes.'),
  ('Missouri Southern State University','RHP — velo arm', array['RHP'], 2026, 2027, true, 2.75, array['velocity'], null, null, 90, null, 'Power arm, upper-80s to low-90s.'),
  ('Missouri Southern State University','3B — power corner', array['3B'], 2026, 2027, false, 2.75, array['power'], 93, null, null, null, 'Third baseman with over-the-fence power.'),
  ('University of Texas at Tyler','CF — burner', array['CF','OF'], 2026, 2027, false, 2.75, array['speed','defense'], null, 6.60, null, null, 'True center fielder with plus speed.'),
  ('University of Texas at Tyler','RHP transfer — depth', array['RHP'], 2024, 2026, true, 2.75, array[]::text[], null, null, 87, null, 'Transfer right-hander for rotation depth.'),
  ('MidAmerica Nazarene University','Catcher — leader', array['C'], 2026, 2027, false, 2.75, array['leadership','framing'], null, null, null, 2.05, 'Catcher who runs the staff.'),
  ('MidAmerica Nazarene University','2B — gritty', array['2B'], 2026, 2027, false, 2.75, array['contact'], null, 7.00, null, null, 'Second baseman, tough out, plays hard.'),
  ('Oklahoma Wesleyan University','SS — athlete', array['SS'], 2026, 2027, true, 2.5, array['athleticism'], 87, 6.85, null, null, 'Athletic shortstop, two-way upside.'),
  ('Oklahoma Wesleyan University','OF — bat first', array['OF','LF'], 2026, 2027, false, 2.5, array['bat'], 91, null, null, null, 'Outfielder who profiles as a bat.'),
  ('Oklahoma Wesleyan University','RHP — strike thrower', array['RHP'], 2026, 2027, true, 2.5, array['command'], null, null, 83, null, 'Right-hander who throws strikes and competes.')
) as v(program, title, positions, gy_min, gy_max, transfer, min_gpa, must_have, min_ev, min_60, min_fb, min_pop, descr)
join public.programs p on p.name = v.program;

-- ---------------------------------------------------------------------------
-- 5. Players (~40)
-- ---------------------------------------------------------------------------
do $$
declare
  v_first text[] := array['Jaden','Mason','Caleb','Tyler','Diego','Owen','Luis','Brady','Carter','Nolan',
                          'Eli','Hunter','Gavin','Marcus','Kade','Riley','Cole','Ezra','Rhys','Tanner',
                          'Jaxon','Beau','Trey','Luca','Sawyer','Drew','Miles','Reed','Dax','Knox',
                          'Zane','Cruz','Angel','Rylan','Jett','Bo','Camden','Griffin','Isaiah','Wyatt'];
  v_last  text[] := array['Alvarez','Boone','Carr','Dunn','Ellis','Flores','Garza','Hayes','Irwin','James',
                          'Keller','Lara','Mata','Nash','Ortiz','Pena','Quinn','Reyes','Salas','Tate',
                          'Upton','Vega','Ward','Yates','Zamora','Blake','Cross','Diaz','Finch','Gold',
                          'Hale','Ives','Jung','King','Lowe','Mills','Nunez','Pace','Rhodes','Sims'];
  v_city  text[] := array['Wichita','Overland Park','Tulsa','Oklahoma City','Dallas','Fort Worth','Springfield','Kansas City','Lawrence','Norman','Edmond','Austin'];
  v_state text[] := array['KS','KS','OK','OK','TX','TX','MO','MO','KS','OK','OK','TX'];
  v_lat   float8[] := array[37.6872,38.9822,36.1540,35.4676,32.7767,32.7555,37.2090,39.0997,38.9717,35.2226,35.6528,30.2672];
  v_lng   float8[] := array[-97.3301,-94.6708,-95.9928,-97.5164,-96.7970,-97.3308,-93.2923,-94.5786,-95.2353,-97.4395,-97.4781,-97.7431];
  i int;
  uid uuid;
  ci int;
  pos text[];
  prim text;
  gy int;
  transfer boolean;
begin
  for i in 1..40 loop
    ci := 1 + ((i - 1) % array_length(v_city, 1));
    case (i % 8)
      when 0 then pos := array['C'];
      when 1 then pos := array['SS','2B'];
      when 2 then pos := array['OF','CF'];
      when 3 then pos := array['RHP'];
      when 4 then pos := array['LHP'];
      when 5 then pos := array['1B','3B'];
      when 6 then pos := array['3B','OF'];
      else pos := array['2B','SS'];
    end case;
    prim := pos[1];
    gy := 2025 + (i % 3);
    transfer := (i % 7 = 0);

    uid := public._seed_user(
      'player' || i || '@seed.athletx',
      v_first[1 + ((i - 1) % array_length(v_first, 1))] || ' ' ||
        v_last[1 + ((i - 1) % array_length(v_last, 1))],
      'player', 'athletxdemo');

    update public.players set
      grad_year = gy,
      primary_position = prim,
      positions = pos,
      bats = (array['R','L','S'])[1 + (i % 3)],
      throws = case when prim in ('LHP') then 'L' else (array['R','R','L'])[1 + (i % 3)] end,
      height_in = 70 + (i % 8),
      weight_lb = 170 + (i % 40),
      gpa = least(4.0, round((2.6 + (i % 15) * 0.1)::numeric, 2)),
      city = v_city[ci],
      state = v_state[ci],
      lat = v_lat[ci],
      lng = v_lng[ci],
      is_transfer = transfer,
      current_school = case when transfer then 'Community College' else null end,
      sixty_yd = round((6.4 + (i % 7) * 0.1)::numeric, 2),
      exit_velo = case when prim in ('RHP','LHP') then null else 88 + (i % 12) end,
      inf_velo = case when prim in ('SS','2B','3B','1B') then 78 + (i % 10) else null end,
      of_velo = case when prim in ('OF','CF','LF','RF') then 82 + (i % 10) else null end,
      fastball_velo = case when prim in ('RHP','LHP') then 82 + (i % 10) else null end,
      pop_time = case when prim = 'C' then round((1.9 + (i % 5) * 0.05)::numeric, 2) else null end,
      bio = 'Competitive ' || prim || ' looking for the right program fit.',
      updated_at = now()
    where id = uid;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Applications — each player applies to up to 3 needs they qualify for
--    (hard filters: position overlap, grad-year/transfer pool, GPA floor)
-- ---------------------------------------------------------------------------
with eligible as (
  select
    n.id as need_id,
    pl.id as player_id,
    -- simple placeholder fit (real scoring arrives in lib/fit.ts, phase 6)
    greatest(40, least(99,
      72
      + case when n.min_exit_velo is not null and pl.exit_velo is not null and pl.exit_velo >= n.min_exit_velo then 8 else 0 end
      + case when n.min_fastball_velo is not null and pl.fastball_velo is not null and pl.fastball_velo >= n.min_fastball_velo then 8 else 0 end
      + case when n.min_sixty is not null and pl.sixty_yd is not null and pl.sixty_yd <= n.min_sixty then 6 else 0 end
      + case when n.min_pop_time is not null and pl.pop_time is not null and pl.pop_time <= n.min_pop_time then 6 else 0 end
      + case when pl.gpa >= n.min_gpa + 0.5 then 5 else 0 end
      + (abs(hashtext(pl.id::text || n.id::text)) % 10)
    ))::int as fit_score
  from public.players pl
  join public.needs n on (
    pl.positions && n.positions
    and (
      (n.accepts_transfer and pl.is_transfer)
      or pl.grad_year between n.grad_year_min and n.grad_year_max
    )
    and pl.gpa >= n.min_gpa
  )
  where n.status = 'open'
),
ranked as (
  select *, row_number() over (partition by player_id order by random()) as pick
  from eligible
)
insert into public.applications (need_id, player_id, status, fit_score, created_at, viewed_at)
select
  r.need_id,
  r.player_id,
  s.status,
  r.fit_score,
  now() - (random() * interval '14 days') as created_at,
  case when s.status = 'new' then null else now() - (random() * interval '7 days') end as viewed_at
from ranked r
cross join lateral (
  select (array['new','new','new','viewed','interested'])[1 + floor(random() * 5)]::public.application_status as status
) s
where r.pick <= 3
  and (abs(hashtext(r.player_id::text)) % 10) < 7;   -- ~70% of players apply

-- ---------------------------------------------------------------------------
-- 6.5 Demo posts (Updates feed + Highlights feed)
--     Every player gets an update; half get a sample highlight video.
-- ---------------------------------------------------------------------------
insert into public.player_posts (player_id, kind, body, created_at)
select
  id, 'update',
  (array[
    'Hit a new PR in the weight room today. Grind continues.',
    'Great showcase this weekend — felt locked in at the plate.',
    'Added velo this fall. Work is paying off.',
    'Team captain this year. Ready to lead.',
    'Visited a campus I loved — facilities were unreal.',
    'Locked in on grades and reps. Open to the right fit.'
  ])[1 + (abs(hashtext(id::text)) % 6)],
  now() - (random() * interval '14 days')
from public.players;

insert into public.player_posts (player_id, kind, body, media_url, media_type, created_at)
select
  id, 'highlight',
  (array['BP round — oppo pop', 'Bullpen: FB / breaking ball', 'Infield actions', '60 time + throws across'])[1 + (abs(hashtext(id::text)) % 4)],
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'video',
  now() - (random() * interval '14 days')
from public.players
where (abs(hashtext(id::text)) % 2) = 0;

-- ---------------------------------------------------------------------------
-- 7. Mark seeded accounts as onboarded (skip the onboarding flow)
-- ---------------------------------------------------------------------------
update public.profiles set onboarded = true where email like '%@seed.athletx';

-- ---------------------------------------------------------------------------
-- 8. Cleanup helper
-- ---------------------------------------------------------------------------
drop function if exists public._seed_user(text, text, text, text);
