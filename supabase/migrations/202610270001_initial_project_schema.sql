-- DCODE Low Balance: database foundation (draft migration 0001)
-- PostgreSQL with Supabase Auth/RLS. Not connected to the frontend and not data-importing.
begin;
create extension if not exists pgcrypto;

create table public.workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(trim(name)) between 1 and 160),
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspace_members (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','admin','editor','viewer')),
 created_at timestamptz not null default now(), primary key(workspace_id,user_id)
);
create table public.projects (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 project_code text, name text not null check(length(trim(name)) between 1 and 200),
 customer_reference text, status text not null default 'draft' check(status in ('draft','active','on_hold','completed','archived')),
 metadata jsonb not null default '{}'::jsonb,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,project_code)
);
create table public.rooms (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 name text not null, width_mm numeric(12,3) check(width_mm is null or width_mm>0),
 depth_mm numeric(12,3) check(depth_mm is null or depth_mm>0),
 height_mm numeric(12,3) check(height_mm is null or height_mm>0),
 level_name text, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.designs (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 room_id uuid references public.rooms(id) on delete set null,
 name text not null, furniture_type text,
 status text not null default 'draft' check(status in ('draft','in_review','approved','archived')),
 current_revision_id uuid, created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.design_revisions (
 id uuid primary key default gen_random_uuid(),
 design_id uuid not null references public.designs(id) on delete cascade,
 revision_number integer not null check(revision_number>0),
 source_schema text not null, source_schema_version integer not null check(source_schema_version>0),
 snapshot jsonb not null, change_note text,
 approval_status text not null default 'unreviewed' check(approval_status in ('unreviewed','needs_review','approved','rejected')),
 approved_by uuid references auth.users(id) on delete restrict, approved_at timestamptz,
 created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(),
 unique(design_id,revision_number),
 check((approval_status='approved' and approved_by is not null and approved_at is not null) or approval_status<>'approved')
);
alter table public.designs add constraint designs_current_revision_fk foreign key(current_revision_id) references public.design_revisions(id) on delete set null;

create table public.assemblies (
 id uuid primary key default gen_random_uuid(),
 design_revision_id uuid not null references public.design_revisions(id) on delete cascade,
 parent_assembly_id uuid references public.assemblies(id) on delete cascade,
 stable_key text not null, name text not null, assembly_type text,
 parameters jsonb not null default '{}'::jsonb, geometry jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), unique(design_revision_id,stable_key)
);
create table public.materials (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid references public.workspaces(id) on delete cascade,
 material_code text, name text not null, material_type text not null default 'unspecified',
 thickness_mm numeric(10,3) check(thickness_mm is null or thickness_mm>0),
 brand text, grade text, decor_code text, finish text, grain_required boolean,
 specification jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.hardware_models (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid references public.workspaces(id) on delete cascade,
 manufacturer text not null, model_code text not null, name text, hardware_type text not null,
 source_url text, specification jsonb not null default '{}'::jsonb, source_checked_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,manufacturer,model_code)
);
create table public.components (
 id uuid primary key default gen_random_uuid(),
 design_revision_id uuid not null references public.design_revisions(id) on delete cascade,
 assembly_id uuid references public.assemblies(id) on delete set null,
 stable_key text not null, part_name text not null, part_type text not null default 'panel',
 length_mm numeric(12,3) check(length_mm is null or length_mm>0),
 width_mm numeric(12,3) check(width_mm is null or width_mm>0),
 thickness_mm numeric(12,3) check(thickness_mm is null or thickness_mm>0),
 quantity integer not null default 1 check(quantity>0),
 material_id uuid references public.materials(id) on delete set null,
 hardware_model_id uuid references public.hardware_models(id) on delete set null,
 finish_spec jsonb not null default '{}'::jsonb, edge_banding jsonb not null default '{}'::jsonb,
 machining jsonb not null default '{}'::jsonb, dimension_provenance jsonb not null default '{}'::jsonb,
 confirmation_status text not null default 'needs_review' check(confirmation_status in ('needs_review','verified','approved')),
 created_at timestamptz not null default now(), unique(design_revision_id,stable_key)
);
create table public.manufacturing_operations (
 id uuid primary key default gen_random_uuid(),
 component_id uuid not null references public.components(id) on delete cascade,
 operation_type text not null, parameters jsonb not null default '{}'::jsonb,
 sequence_number integer not null default 1 check(sequence_number>0),
 status text not null default 'unverified' check(status in ('unverified','verified','approved','blocked')),
 created_at timestamptz not null default now()
);
create table public.cutlist_revisions (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 design_revision_id uuid references public.design_revisions(id) on delete restrict,
 revision_number integer not null check(revision_number>0), source_kind text not null default 'design',
 source_metadata jsonb not null default '{}'::jsonb, parts_snapshot jsonb not null,
 validation_summary jsonb not null default '{}'::jsonb,
 release_status text not null default 'draft' check(release_status in ('draft','needs_review','approved','released','superseded')),
 created_by uuid not null references auth.users(id) on delete restrict,
 approved_by uuid references auth.users(id) on delete restrict, approved_at timestamptz,
 created_at timestamptz not null default now(), unique(project_id,revision_number),
 check((release_status in ('approved','released') and approved_by is not null and approved_at is not null) or release_status not in ('approved','released'))
);
create table public.validation_results (
 id uuid primary key default gen_random_uuid(),
 design_revision_id uuid references public.design_revisions(id) on delete cascade,
 cutlist_revision_id uuid references public.cutlist_revisions(id) on delete cascade,
 rule_code text not null, severity text not null check(severity in ('info','warning','error','blocking')),
 result_status text not null check(result_status in ('pass','fail','needs_review','not_run')),
 message text not null, evidence jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
 check(design_revision_id is not null or cutlist_revision_id is not null)
);
create table public.file_assets (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 design_revision_id uuid references public.design_revisions(id) on delete set null,
 storage_bucket text, storage_path text, original_filename text not null, media_type text,
 byte_size bigint check(byte_size is null or byte_size>=0), sha256 text,
 purpose text not null default 'source_drawing', metadata jsonb not null default '{}'::jsonb,
 uploaded_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(),
 check(storage_path is not null or metadata ? 'external_reference')
);
create table public.audit_events (
 id bigint generated always as identity primary key,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 entity_type text not null, entity_id uuid, action text not null,
 details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index projects_workspace_idx on public.projects(workspace_id);
create index rooms_project_idx on public.rooms(project_id);
create index designs_project_idx on public.designs(project_id);
create index revisions_design_idx on public.design_revisions(design_id,revision_number desc);
create index assemblies_revision_idx on public.assemblies(design_revision_id);
create index components_revision_idx on public.components(design_revision_id);
create index operations_component_idx on public.manufacturing_operations(component_id);
create index cutlists_project_idx on public.cutlist_revisions(project_id,revision_number desc);
create index validation_revision_idx on public.validation_results(design_revision_id);
create index files_project_idx on public.file_assets(project_id);
create index audit_workspace_idx on public.audit_events(workspace_id,created_at desc);

create function public.set_updated_at() returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at=now(); return new; end; $$;
create trigger workspaces_set_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at before update on public.rooms for each row execute function public.set_updated_at();
create trigger designs_set_updated_at before update on public.designs for each row execute function public.set_updated_at();
create trigger materials_set_updated_at before update on public.materials for each row execute function public.set_updated_at();
create trigger hardware_models_set_updated_at before update on public.hardware_models for each row execute function public.set_updated_at();

create function public.is_workspace_member(target_workspace uuid) returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.workspace_members wm where wm.workspace_id=target_workspace and wm.user_id=(select auth.uid())); $$;
create function public.can_edit_workspace(target_workspace uuid) returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.workspace_members wm where wm.workspace_id=target_workspace and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin','editor')); $$;
create function public.is_workspace_admin(target_workspace uuid) returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.workspace_members wm where wm.workspace_id=target_workspace and wm.user_id=(select auth.uid()) and wm.role in ('owner','admin')); $$;

-- Bootstrap the creator as owner in the same transaction as workspace creation.
-- This avoids a client-side gap where a new workspace exists without an owner membership.
create function public.add_workspace_creator_as_owner()
returns trigger language plpgsql security definer set search_path=''
as $
begin
  insert into public.workspace_members(workspace_id,user_id,role)
  values (new.id,new.created_by,'owner')
  on conflict (workspace_id,user_id) do nothing;
  return new;
end;
$;
create trigger workspaces_add_creator_owner
after insert on public.workspaces
for each row execute function public.add_workspace_creator_as_owner();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.rooms enable row level security;
alter table public.designs enable row level security;
alter table public.design_revisions enable row level security;
alter table public.assemblies enable row level security;
alter table public.materials enable row level security;
alter table public.hardware_models enable row level security;
alter table public.components enable row level security;
alter table public.manufacturing_operations enable row level security;
alter table public.cutlist_revisions enable row level security;
alter table public.validation_results enable row level security;
alter table public.file_assets enable row level security;
alter table public.audit_events enable row level security;

create policy workspaces_select_member on public.workspaces for select using(public.is_workspace_member(id));
create policy workspaces_insert_creator on public.workspaces for insert with check(created_by=(select auth.uid()));
create policy workspaces_update_admin on public.workspaces for update using(public.is_workspace_admin(id)) with check(public.is_workspace_admin(id));
create policy workspaces_delete_owner on public.workspaces for delete using(exists(select 1 from public.workspace_members wm where wm.workspace_id=id and wm.user_id=(select auth.uid()) and wm.role='owner'));

create policy members_select_same_workspace on public.workspace_members for select using(user_id=(select auth.uid()) or public.is_workspace_member(workspace_id));
create policy members_insert_self_owner on public.workspace_members for insert with check(user_id=(select auth.uid()) and role='owner' and exists(select 1 from public.workspaces w where w.id=workspace_id and w.created_by=(select auth.uid())));
create policy members_admin_manage on public.workspace_members for all using(public.is_workspace_admin(workspace_id)) with check(public.is_workspace_admin(workspace_id));

create policy projects_member_select on public.projects for select using(public.is_workspace_member(workspace_id));
create policy projects_editor_insert on public.projects for insert with check(public.can_edit_workspace(workspace_id) and created_by=(select auth.uid()));
create policy projects_editor_update on public.projects for update using(public.can_edit_workspace(workspace_id)) with check(public.can_edit_workspace(workspace_id));
create policy projects_admin_delete on public.projects for delete using(public.is_workspace_admin(workspace_id));

create policy rooms_member_all on public.rooms for all using(exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_member(p.workspace_id))) with check(exists(select 1 from public.projects p where p.id=project_id and public.can_edit_workspace(p.workspace_id)));
create policy designs_member_all on public.designs for all using(exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_member(p.workspace_id))) with check(exists(select 1 from public.projects p where p.id=project_id and public.can_edit_workspace(p.workspace_id)));
create policy revisions_member_all on public.design_revisions for all using(exists(select 1 from public.designs d join public.projects p on p.id=d.project_id where d.id=design_id and public.is_workspace_member(p.workspace_id))) with check(exists(select 1 from public.designs d join public.projects p on p.id=d.project_id where d.id=design_id and public.can_edit_workspace(p.workspace_id)));
create policy assemblies_member_all on public.assemblies for all using(exists(select 1 from public.design_revisions r join public.designs d on d.id=r.design_id join public.projects p on p.id=d.project_id where r.id=design_revision_id and public.is_workspace_member(p.workspace_id))) with check(exists(select 1 from public.design_revisions r join public.designs d on d.id=r.design_id join public.projects p on p.id=d.project_id where r.id=design_revision_id and public.can_edit_workspace(p.workspace_id)));
create policy materials_member_all on public.materials for all using(workspace_id is null or public.is_workspace_member(workspace_id)) with check(workspace_id is null or public.can_edit_workspace(workspace_id));
create policy hardware_member_all on public.hardware_models for all using(workspace_id is null or public.is_workspace_member(workspace_id)) with check(workspace_id is null or public.can_edit_workspace(workspace_id));
create policy components_member_all on public.components for all using(exists(select 1 from public.design_revisions r join public.designs d on d.id=r.design_id join public.projects p on p.id=d.project_id where r.id=design_revision_id and public.is_workspace_member(p.workspace_id))) with check(exists(select 1 from public.design_revisions r join public.designs d on d.id=r.design_id join public.projects p on p.id=d.project_id where r.id=design_revision_id and public.can_edit_workspace(p.workspace_id)));
create policy operations_member_all on public.manufacturing_operations for all using(exists(select 1 from public.components c join public.design_revisions r on r.id=c.design_revision_id join public.designs d on d.id=r.design_id join public.projects p on p.id=d.project_id where c.id=component_id and public.is_workspace_member(p.workspace_id))) with check(exists(select 1 from public.components c join public.design_revisions r on r.id=c.design_revision_id join public.designs d on d.id=r.design_id join public.projects p on p.id=d.project_id where c.id=component_id and public.can_edit_workspace(p.workspace_id)));
create policy cutlists_member_all on public.cutlist_revisions for all using(exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_member(p.workspace_id))) with check(exists(select 1 from public.projects p where p.id=project_id and public.can_edit_workspace(p.workspace_id)));
create policy validation_member_all on public.validation_results for all using((design_revision_id is not null and exists(select 1 from public.design_revisions r join public.designs d on d.id=r.design_id join public.projects p on p.id=d.project_id where r.id=design_revision_id and public.is_workspace_member(p.workspace_id))) or (cutlist_revision_id is not null and exists(select 1 from public.cutlist_revisions cr join public.projects p on p.id=cr.project_id where cr.id=cutlist_revision_id and public.is_workspace_member(p.workspace_id)))) with check((design_revision_id is not null and exists(select 1 from public.design_revisions r join public.designs d on d.id=r.design_id join public.projects p on p.id=d.project_id where r.id=design_revision_id and public.can_edit_workspace(p.workspace_id))) or (cutlist_revision_id is not null and exists(select 1 from public.cutlist_revisions cr join public.projects p on p.id=cr.project_id where cr.id= cutlist_revision_id and public.can_edit_workspace(p.workspace_id))));
create policy files_member_all on public.file_assets for all using(exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_member(p.workspace_id))) with check(exists(select 1 from public.projects p where p.id=project_id and public.can_edit_workspace(p.workspace_id)));
create policy audit_member_select on public.audit_events for select using(public.is_workspace_member(workspace_id));
create policy audit_editor_insert on public.audit_events for insert with check(public.can_edit_workspace(workspace_id) and (actor_user_id is null or actor_user_id=(select auth.uid())));

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.can_edit_workspace(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;
commit;
