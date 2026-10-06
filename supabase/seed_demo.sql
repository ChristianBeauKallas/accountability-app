-- ---------------------------------------------------------------------------
-- Demo league — broad, nationwide sample data so testers anywhere see fits,
-- and tapping a school opens a fully built-out program page.
--
-- Safe to run in the Supabase SQL editor (bypasses RLS as the owner) and
-- idempotent (fixed UUIDs + ON CONFLICT / NOT EXISTS). Positions span every
-- spot and needs accept 2024–2029 + transfers with no GPA/metric bars, so
-- any player profile is eligible for several regardless of location.
--
-- To remove later: delete from public.programs where id::text like 'd3a00000-%';
-- (needs and program_posts cascade-delete with their program).
-- ---------------------------------------------------------------------------

-- Programs ------------------------------------------------------------------
insert into public.programs
  (id, name, division, city, state, lat, lng, conference, enrollment, min_gpa, record_last_season, verified)
values
  ('d3a00000-0000-4000-8000-000000000001','Sunset Valley College','JUCO','Pasadena','CA',34.1478,-118.1445,'Pacific JC',3200,2.00,'30-22',true),
  ('d3a00000-0000-4000-8000-000000000002','Cascade State','D2','Seattle','WA',47.6062,-122.3321,'Northwest Conference',9000,2.50,'36-18',true),
  ('d3a00000-0000-4000-8000-000000000003','Desert Valley University','NAIA','Phoenix','AZ',33.4484,-112.0740,'Sun Conference',5200,2.25,'28-20',true),
  ('d3a00000-0000-4000-8000-000000000004','Front Range College','JUCO','Denver','CO',39.7392,-104.9903,'Rocky Mountain JC',2800,2.00,'33-15',true),
  ('d3a00000-0000-4000-8000-000000000005','Rose City University','D3','Portland','OR',45.5152,-122.6784,'Cascade Conference',3400,2.75,'24-16',true),
  ('d3a00000-0000-4000-8000-000000000006','Lakeshore University','D2','Chicago','IL',41.8781,-87.6298,'Great Lakes Conference',14000,2.50,'38-16',true),
  ('d3a00000-0000-4000-8000-000000000007','Buckeye Valley College','JUCO','Columbus','OH',39.9612,-82.9988,'Midwest JC',4100,2.00,'35-12',true),
  ('d3a00000-0000-4000-8000-000000000008','North Star University','D3','Minneapolis','MN',44.9778,-93.2650,'Twin Rivers Conference',6800,3.00,'22-17',true),
  ('d3a00000-0000-4000-8000-000000000009','Prairie State University','NAIA','Wichita','KS',37.6872,-97.3301,'Heartland Conference',7200,2.50,'31-19',true),
  ('d3a00000-0000-4000-8000-000000000010','Hill Country University','D2','Austin','TX',30.2672,-97.7431,'Lone Star Conference',16000,2.50,'40-14',true),
  ('d3a00000-0000-4000-8000-000000000011','Sunshine State College','JUCO','Orlando','FL',28.5383,-81.3792,'Gulf Coast JC',3600,2.00,'34-13',true),
  ('d3a00000-0000-4000-8000-000000000012','Peachtree University','NAIA','Atlanta','GA',33.7490,-84.3880,'Southern Conference',8800,2.25,'29-21',true),
  ('d3a00000-0000-4000-8000-000000000013','Queen City University','D2','Charlotte','NC',35.2271,-80.8431,'Carolinas Conference',11000,2.50,'37-17',true),
  ('d3a00000-0000-4000-8000-000000000014','Empire State College','D3','New York','NY',40.7128,-74.0060,'Metro Conference',2400,3.00,'20-18',true),
  ('d3a00000-0000-4000-8000-000000000015','Liberty Bell University','D2','Philadelphia','PA',39.9526,-75.1652,'Keystone Conference',13000,2.50,'33-20',true),
  ('d3a00000-0000-4000-8000-000000000016','Bay State University','D3','Boston','MA',42.3601,-71.0589,'New England Conference',5600,2.75,'26-15',true)
on conflict (id) do nothing;

-- Flavor copy (templated so it varies by program) --------------------------
update public.programs set
  about =
    'A ' || division || ' program in ' || coalesce(city, '') || ', ' || coalesce(state, '') ||
    '. We develop players year-round, compete for conference titles, and have a strong pipeline to the next level. ' ||
    'Close-knit clubhouse, real academic support, and a staff that recruits for fit over hype.',
  recruiting_pitch = case (abs(hashtext(id::text)) % 3)
    when 0 then 'We target athletic, high-motor players who compete — bats that control the zone, arms that throw strikes, and defenders who can pick it. Makeup matters as much as the tools.'
    when 1 then 'We recruit projectable, coachable players who want to get better every day. If you play the game hard and the right way, you''ll fit right in here.'
    else 'We look for competitors who impact winning — premium defenders up the middle, bats with a plan, and arms that attack the strike zone.'
  end
where id::text like 'd3a00000-%';

-- Needs ---------------------------------------------------------------------
insert into public.needs
  (id, program_id, title, positions, grad_year_min, grad_year_max, accepts_transfer, min_gpa, must_have, description, status)
values
  ('d3b00000-0000-4000-8000-000000000001','d3a00000-0000-4000-8000-000000000001','Middle infield — bat and glove',ARRAY['SS','2B'],2024,2029,true,0.00,ARRAY['glove','contact'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000002','d3a00000-0000-4000-8000-000000000001','Weekend rotation arm',ARRAY['RHP','LHP'],2024,2029,true,0.00,ARRAY['command'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000003','d3a00000-0000-4000-8000-000000000002','Corner infield bat',ARRAY['1B','3B'],2024,2029,true,0.00,ARRAY['power'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000004','d3a00000-0000-4000-8000-000000000002','Outfield speed',ARRAY['LF','CF','RF','OF'],2024,2029,true,0.00,ARRAY['speed'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000005','d3a00000-0000-4000-8000-000000000003','Everyday catcher',ARRAY['C'],2024,2029,true,0.00,ARRAY['receiving'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000006','d3a00000-0000-4000-8000-000000000003','Utility bat',ARRAY['UTIL','DH'],2024,2029,true,0.00,ARRAY['versatility'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000007','d3a00000-0000-4000-8000-000000000004','Infield depth',ARRAY['SS','2B','3B'],2024,2029,true,0.00,ARRAY['glove'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000008','d3a00000-0000-4000-8000-000000000004','Bullpen velocity',ARRAY['RHP'],2024,2029,true,0.00,ARRAY['velocity'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000009','d3a00000-0000-4000-8000-000000000005','Center field glove',ARRAY['CF','OF'],2024,2029,true,0.00,ARRAY['range'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000010','d3a00000-0000-4000-8000-000000000005','Lefty starter',ARRAY['LHP'],2024,2029,true,0.00,ARRAY['command'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000011','d3a00000-0000-4000-8000-000000000006','Power bat',ARRAY['1B','DH'],2024,2029,true,0.00,ARRAY['power'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000012','d3a00000-0000-4000-8000-000000000006','Defensive catcher',ARRAY['C'],2024,2029,true,0.00,ARRAY['blocking'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000013','d3a00000-0000-4000-8000-000000000007','Middle infield 2026/27',ARRAY['2B','SS'],2024,2029,true,0.00,ARRAY['contact'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000014','d3a00000-0000-4000-8000-000000000007','Starting pitching',ARRAY['RHP','LHP'],2024,2029,true,0.00,ARRAY['innings'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000015','d3a00000-0000-4000-8000-000000000008','Versatile bat',ARRAY['3B','OF'],2024,2029,true,0.00,ARRAY['versatility'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000016','d3a00000-0000-4000-8000-000000000008','Right-handed reliever',ARRAY['RHP'],2024,2029,true,0.00,ARRAY['velocity'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000017','d3a00000-0000-4000-8000-000000000009','Corner outfield bat',ARRAY['OF','LF','RF'],2024,2029,true,0.00,ARRAY['power'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000018','d3a00000-0000-4000-8000-000000000009','Catch and utility',ARRAY['C','UTIL'],2024,2029,true,0.00,ARRAY['versatility'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000019','d3a00000-0000-4000-8000-000000000010','Shortstop — premium defender',ARRAY['SS'],2024,2029,true,0.00,ARRAY['glove'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000020','d3a00000-0000-4000-8000-000000000010','Middle of order bat',ARRAY['DH','1B'],2024,2029,true,0.00,ARRAY['power'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000021','d3a00000-0000-4000-8000-000000000011','Pitching depth',ARRAY['RHP','LHP'],2024,2029,true,0.00,ARRAY['command'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000022','d3a00000-0000-4000-8000-000000000011','Table setter',ARRAY['2B','OF'],2024,2029,true,0.00,ARRAY['speed'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000023','d3a00000-0000-4000-8000-000000000012','Catcher — 2027/28',ARRAY['C'],2024,2029,true,0.00,ARRAY['receiving'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000024','d3a00000-0000-4000-8000-000000000012','Left side infield',ARRAY['3B','SS'],2024,2029,true,0.00,ARRAY['arm'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000025','d3a00000-0000-4000-8000-000000000013','Outfield — speed and range',ARRAY['OF','CF'],2024,2029,true,0.00,ARRAY['speed'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000026','d3a00000-0000-4000-8000-000000000013','Friday night starter',ARRAY['RHP'],2024,2029,true,0.00,ARRAY['command'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000027','d3a00000-0000-4000-8000-000000000014','Bat-first utility',ARRAY['UTIL','DH','1B'],2024,2029,true,0.00,ARRAY['hit'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000028','d3a00000-0000-4000-8000-000000000014','Lefty bullpen',ARRAY['LHP'],2024,2029,true,0.00,ARRAY['deception'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000029','d3a00000-0000-4000-8000-000000000015','Infield — any spot',ARRAY['2B','SS','3B'],2024,2029,true,0.00,ARRAY['glove'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000030','d3a00000-0000-4000-8000-000000000015','Receiving catcher',ARRAY['C'],2024,2029,true,0.00,ARRAY['framing'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000031','d3a00000-0000-4000-8000-000000000016','Outfield depth',ARRAY['LF','CF','RF','OF'],2024,2029,true,0.00,ARRAY['speed'],'Demo opportunity.','open'),
  ('d3b00000-0000-4000-8000-000000000032','d3a00000-0000-4000-8000-000000000016','Arms — any role',ARRAY['RHP','LHP'],2024,2029,true,0.00,ARRAY['command'],'Demo opportunity.','open')
on conflict (id) do nothing;

-- Program updates (text posts; idempotent per program) ----------------------
insert into public.program_posts (program_id, kind, body, created_at)
select p.id, 'update', t.body, now() - (t.ord * interval '4 days')
from public.programs p
cross join (values
  (1, 'Fall ID camp is live — open to 2026 and 2027 recruits. Limited spots, sign up early.'),
  (2, 'Two more commitments this week. Our class is filling up fast — reach out if you fit what we need.')
) as t(ord, body)
where p.id::text like 'd3a00000-%'
  and not exists (
    select 1 from public.program_posts pp
    where pp.program_id = p.id and pp.kind = 'update'
  );

-- Facility notes (text posts; idempotent per program) -----------------------
insert into public.program_posts (program_id, kind, body, created_at)
select p.id, 'facility', t.body, now() - (t.ord * interval '12 days')
from public.programs p
cross join (values
  (1, 'Renovated turf infield — true hops and playable year-round.'),
  (2, 'Indoor hitting facility with six cages and HitTrax.'),
  (3, 'Strength and performance center with full-time staff.')
) as t(ord, body)
where p.id::text like 'd3a00000-%'
  and not exists (
    select 1 from public.program_posts pp
    where pp.program_id = p.id and pp.kind = 'facility'
  );
