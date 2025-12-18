-- Fix tests_public view RLS issue
-- Revoke anonymous access to tests_public view
REVOKE SELECT ON public.tests_public FROM anon;

-- Grant select only to authenticated users
GRANT SELECT ON public.tests_public TO authenticated;

-- Add comment explaining the security model
COMMENT ON VIEW public.tests_public IS 'Public view of tests with answers stripped. Access restricted to authenticated users only.';
