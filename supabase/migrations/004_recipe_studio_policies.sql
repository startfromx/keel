-- M6: allow authenticated users to save and publish recipe versions.
-- Recipes are module-level configuration in v1; later versions can add an owner/team scope.

create policy "recipe_authenticated_insert"
  on recipes for insert
  with check (auth.role() = 'authenticated');

create policy "recipe_authenticated_update"
  on recipes for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
