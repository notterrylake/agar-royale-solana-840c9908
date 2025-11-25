-- Drop the insecure INSERT policy
DROP POLICY IF EXISTS "Users can insert their own spin results" ON public.spin_results;

-- Create secure INSERT policy - only service role can create spin results
CREATE POLICY "Only service role can create spin results"
ON public.spin_results
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also fix the SELECT policy to properly isolate user data
DROP POLICY IF EXISTS "Users can view their own spin results" ON public.spin_results;

CREATE POLICY "Users can view their own spin results"
ON public.spin_results
FOR SELECT
TO authenticated, anon
USING (wallet_address = (auth.jwt()->>'wallet_address')::text);