import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  playerName: string;
  walletAddress: string;
  transactionSignature: string;
  skinId?: number;
  sessionCode?: string;
  isQuickPlay?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { playerName, walletAddress, transactionSignature, skinId = 0, sessionCode, isQuickPlay } = body;

    console.log('Create or join game request:', { playerName, walletAddress, isQuickPlay, sessionCode });

    // Check for recent play cooldown
    const { data: recentPlayers } = await supabase
      .from('players')
      .select('id, last_game_ended_at')
      .eq('wallet_address', walletAddress)
      .order('last_game_ended_at', { ascending: false })
      .limit(1);

    if (recentPlayers && recentPlayers.length > 0 && recentPlayers[0].last_game_ended_at) {
      const cooldownEnd = new Date(recentPlayers[0].last_game_ended_at).getTime() + 5000;
      const now = Date.now();
      
      if (now < cooldownEnd) {
        const secondsLeft = Math.ceil((cooldownEnd - now) / 1000);
        return new Response(
          JSON.stringify({ error: `Please wait ${secondsLeft} seconds before starting a new game` }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle Quick Play - Add to matchmaking queue
    if (isQuickPlay) {
      console.log('Adding player to matchmaking queue');
      
      const { data: queueData, error: queueError } = await supabase
        .from('matchmaking_queue')
        .insert({
          player_name: playerName,
          wallet_address: walletAddress,
          bet_transaction_signature: transactionSignature,
          skin_id: skinId,
          status: 'searching',
        })
        .select()
        .single();

      if (queueError) {
        console.error('Queue creation error:', queueError);
        return new Response(
          JSON.stringify({ error: 'Failed to join matchmaking queue' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          queueId: queueData.id,
          mode: 'matchmaking'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let currentSessionId: string;
    let currentSessionCode: string;

    // Handle Join Existing Session
    if (sessionCode) {
      console.log('Joining existing session:', sessionCode);

      // Check for duplicate wallet in this session
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('wallet_address', walletAddress)
        .eq('session_id', sessionCode)
        .maybeSingle();

      if (existingPlayer) {
        return new Response(
          JSON.stringify({ error: 'This wallet is already in this game' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('id, status, pot_amount')
        .eq('session_code', sessionCode.toUpperCase())
        .single();

      if (sessionError || !sessionData) {
        console.error('Session not found:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Game session not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (sessionData.status !== 'waiting') {
        return new Response(
          JSON.stringify({ error: 'This game has already started' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update pot amount
      await supabase
        .from('game_sessions')
        .update({ pot_amount: (sessionData.pot_amount || 0) + 0.05 })
        .eq('id', sessionData.id);

      currentSessionId = sessionData.id;
      currentSessionCode = sessionCode.toUpperCase();
    } else {
      // Handle Create New Private Game
      console.log('Creating new private game session');
      
      const generateSessionCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
      };

      currentSessionCode = generateSessionCode();
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .insert({
          session_code: currentSessionCode,
          status: 'waiting',
          max_players: 3,
          win_condition_food: 100,
          bet_amount: 0.05,
          pot_amount: 0.05,
          lobby_start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (sessionError || !sessionData) {
        console.error('Session creation error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create game session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      currentSessionId = sessionData.id;
    }

    // Create player in the session
    console.log('Creating player in session:', currentSessionId);
    
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        session_id: currentSessionId,
        player_name: playerName,
        wallet_address: walletAddress,
        bet_transaction_signature: transactionSignature,
        has_paid: true,
        skin_id: skinId,
        position_x: Math.random() * 800,
        position_y: Math.random() * 600,
        score: 0,
        is_alive: true,
      })
      .select()
      .single();

    if (playerError) {
      console.error('Player creation error:', playerError);
      
      // Check for duplicate violations
      if (playerError.code === '23505') {
        if (playerError.message.includes('unique_wallet_per_session')) {
          return new Response(
            JSON.stringify({ error: 'This wallet is already in this game' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (playerError.message.includes('unique_transaction_signature')) {
          return new Response(
            JSON.stringify({ error: 'This transaction has already been used' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create player' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Game created/joined successfully:', { sessionId: currentSessionId, playerId: playerData.id });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: currentSessionId,
        sessionCode: currentSessionCode,
        playerId: playerData.id,
        mode: 'lobby'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-or-join-game:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
