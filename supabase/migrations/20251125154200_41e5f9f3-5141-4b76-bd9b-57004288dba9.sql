-- Drop insecure policies
DROP POLICY IF EXISTS "Anyone can create game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can update game sessions" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can view game sessions" ON public.game_sessions;

-- Only service role can create game sessions
CREATE POLICY "Only service role can create game sessions"
ON public.game_sessions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Only service role can update game sessions
CREATE POLICY "Only service role can update game sessions"
ON public.game_sessions
FOR UPDATE
TO service_role
USING (true);

-- Users can view game sessions they participate in
CREATE POLICY "Users can view their game sessions"
ON public.game_sessions
FOR SELECT
TO authenticated, anon
USING (
  -- Allow viewing if the user is a player in this session
  EXISTS (
    SELECT 1 FROM public.players
    WHERE players.session_id = game_sessions.id
    AND players.wallet_address = (auth.jwt()->>'wallet_address')::text
  )
);