-- M5: allow a share-token route to read only the shared brief/output.

create policy "public_share_link_read"
  on share_links for select
  using (expires_at is null or expires_at > now());

create policy "public_shared_output_read"
  on outputs for select
  using (
    exists (
      select 1 from share_links s
      where s.brief_id = outputs.brief_id
        and s.output_kind = outputs.kind
        and (s.expires_at is null or s.expires_at > now())
    )
  );
