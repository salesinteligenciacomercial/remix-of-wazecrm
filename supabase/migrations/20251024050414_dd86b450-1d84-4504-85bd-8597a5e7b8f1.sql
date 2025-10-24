-- Temporarily allow any authenticated user to create companies (for testing)
-- You can make this more restrictive later in production

DROP POLICY IF EXISTS "Company admins can create companies" ON public.companies;

CREATE POLICY "Authenticated users can create companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow viewing all companies for now
DROP POLICY IF EXISTS "Company admins view companies" ON public.companies;

CREATE POLICY "Authenticated users view companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);