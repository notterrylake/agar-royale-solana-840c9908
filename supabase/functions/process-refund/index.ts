import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from "npm:@solana/web3.js@1.98.4";
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
    const { playerId, sessionId } = await req.json();
    
    console.log('Processing refund:', { playerId, sessionId });

    if (!playerId || !sessionId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get player and session info
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*, game_sessions(*)')
      .eq('id', playerId)
      .eq('session_id', sessionId)
      .single();

    if (playerError || !player) {
      console.error('Player not found:', playerError);
      return new Response(
        JSON.stringify({ success: false, error: 'Player not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify game hasn't started
    if (player.game_sessions.status !== 'waiting') {
      console.error('Game already started, cannot refund');
      return new Response(
        JSON.stringify({ success: false, error: 'Game already started, refunds not available' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify player has paid
    if (!player.has_paid || !player.bet_transaction_signature) {
      console.error('Player has not paid');
      return new Response(
        JSON.stringify({ success: false, error: 'No payment to refund' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if refund already processed
    if (player.refund_signature) {
      console.log('Refund already processed');
      return new Response(
        JSON.stringify({ 
          success: true, 
          refundSignature: player.refund_signature,
          alreadyProcessed: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is a test transaction (signature starts with "test_")
    const isTestMode = player.bet_transaction_signature?.startsWith('test_');
    
    let refundSignature: string;

    if (isTestMode) {
      // TEST MODE: Skip real Solana transaction
      console.log('Test mode detected - skipping real transaction');
      refundSignature = `refund_test_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    } else {
      // REAL MODE: Process actual Solana refund
      // Get treasury wallet from secrets
      const treasuryPrivateKey = Deno.env.get('TREASURY_WALLET_PRIVATE_KEY');
      if (!treasuryPrivateKey) {
        console.error('Treasury wallet private key not configured');
        return new Response(
          JSON.stringify({ success: false, error: 'Treasury wallet not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse the private key
      let secretKey: Uint8Array;
      try {
        secretKey = Uint8Array.from(JSON.parse(treasuryPrivateKey));
      } catch (error) {
        console.error('Failed to parse treasury private key:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid treasury wallet configuration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const treasuryKeypair = Keypair.fromSecretKey(secretKey);
      console.log('Treasury wallet:', treasuryKeypair.publicKey.toString());

      // Connect to Solana
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

      // Create refund transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: treasuryKeypair.publicKey,
          toPubkey: new PublicKey(player.wallet_address),
          lamports: 0.05 * LAMPORTS_PER_SOL,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = treasuryKeypair.publicKey;

      console.log('Sending refund transaction...');

      // Sign and send transaction
      refundSignature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [treasuryKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3
        }
      );

      console.log('Refund transaction confirmed:', refundSignature);
    }

    // Update player record
    const { error: updatePlayerError } = await supabase
      .from('players')
      .update({
        refund_signature: refundSignature,
        refund_processed_at: new Date().toISOString()
      })
      .eq('id', playerId);

    if (updatePlayerError) {
      console.error('Failed to update player:', updatePlayerError);
      if (!isTestMode) {
        // Transaction succeeded but DB update failed (only critical in real mode)
        console.error('CRITICAL: Refund succeeded but DB update failed', {
          refundSignature,
          playerId
        });
      }
    }

    // Update pot amount in session
    const currentPot = player.game_sessions.pot_amount || 0;
    const { error: updateSessionError } = await supabase
      .from('game_sessions')
      .update({
        pot_amount: Math.max(0, currentPot - 0.05)
      })
      .eq('id', sessionId);

    if (updateSessionError) {
      console.error('Failed to update session pot:', updateSessionError);
    }

    // Delete the player from the session
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (deleteError) {
      console.error('Failed to delete player:', deleteError);
    }

    console.log('Refund processed successfully');
    return new Response(
      JSON.stringify({ 
        success: true,
        refundSignature: refundSignature,
        amount: 0.05,
        recipient: player.wallet_address,
        testMode: isTestMode,
        explorerUrl: isTestMode ? null : `https://explorer.solana.com/tx/${refundSignature}?cluster=devnet`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing refund:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});