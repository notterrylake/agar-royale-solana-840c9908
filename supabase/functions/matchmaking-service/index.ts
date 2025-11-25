import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Matchmaking service triggered');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the oldest 3 players from queue who are still searching
    const { data: queuedPlayers, error: queueError } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('status', 'searching')
      .order('created_at', { ascending: true })
      .limit(3);

    if (queueError) {
      console.error('Error fetching queue:', queueError);
      return new Response(
        JSON.stringify({ success: false, error: queueError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!queuedPlayers || queuedPlayers.length < 3) {
      console.log(`Not enough players in queue: ${queuedPlayers?.length || 0}/3`);
      return new Response(
        JSON.stringify({ success: true, message: 'Waiting for more players', playersFound: queuedPlayers?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found 3 players, creating game session');

    // Generate session code
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create game session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        session_code: sessionCode,
        status: 'waiting',
        max_players: 3,
        win_condition_food: 100,
        bet_amount: 0.05,
        pot_amount: 0.15, // 3 players x 0.05 SOL
        lobby_start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error('Error creating session:', sessionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create game session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created session:', session.id);

    // Create player entries for all 3 players
    const playerInserts = queuedPlayers.map(qp => ({
      session_id: session.id,
      player_name: qp.player_name,
      wallet_address: qp.wallet_address,
      bet_transaction_signature: qp.bet_transaction_signature,
      has_paid: true,
      skin_id: qp.skin_id,
      position_x: Math.random() * 800,
      position_y: Math.random() * 600,
      score: 0,
      is_alive: true,
    }));

    const { error: playersError } = await supabase
      .from('players')
      .insert(playerInserts);

    if (playersError) {
      console.error('Error creating players:', playersError);
      // Cleanup session if player creation fails
      await supabase.from('game_sessions').delete().eq('id', session.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create players' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Created players for session');

    // Mark queue entries as matched
    const queueIds = queuedPlayers.map(qp => qp.id);
    const { error: updateError } = await supabase
      .from('matchmaking_queue')
      .update({ status: 'matched' })
      .in('id', queueIds);

    if (updateError) {
      console.error('Error updating queue status:', updateError);
    }

    console.log('Matchmaking completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        sessionId: session.id,
        sessionCode: session.session_code,
        playersMatched: queuedPlayers.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in matchmaking service:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});