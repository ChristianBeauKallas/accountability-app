-- More staff roles: team admin and athletic director.
alter type public.staff_role add value if not exists 'team_admin';
alter type public.staff_role add value if not exists 'athletic_director';
