import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from "npm:@solana/web3.js@1.98.4";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Team wallet that receives 5% fee
const TEAM_WALLET = new PublicKey('Chpw1W1rghTA6Dmc36AmZfoxnPB8VXR3dGFzgsrQWxhA');
const TEAM_FEE_PERCENTAGE = 0.05; // 5% fee

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, winnerId, winnerWallet, potAmount } = await req.json();
    
    console.log('Processing payout:', { sessionId, winnerId, winnerWallet, potAmount });

    if (!sessionId || !winnerId || !winnerWallet || !potAmount) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the session and winner
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*, players(*)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return new Response(
        JSON.stringify({ success: false, error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify winner exists in this session
    const winner = session.players?.find((p: any) => p.id === winnerId);
    if (!winner || winner.wallet_address !== winnerWallet) {
      console.error('Winner verification failed');
      return new Response(
        JSON.stringify({ success: false, error: 'Winner verification failed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payout already processed
    if (session.payout_signature) {
      console.log('Payout already processed');
      return new Response(
        JSON.stringify({ 
          success: true, 
          signature: session.payout_signature,
          alreadyProcessed: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const secretKey = Uint8Array.from(JSON.parse(treasuryPrivateKey));
    const treasuryKeypair = Keypair.fromSecretKey(secretKey);

    console.log('Treasury wallet:', treasuryKeypair.publicKey.toString());

    // Connect to Solana (use devnet for testing, mainnet for production)
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // Calculate amounts
    const totalLamports = potAmount * LAMPORTS_PER_SOL;
    const teamFeeLamports = Math.floor(totalLamports * TEAM_FEE_PERCENTAGE);
    const winnerLamports = totalLamports - teamFeeLamports;

    console.log('Payout breakdown:', {
      total: potAmount,
      teamFee: teamFeeLamports / LAMPORTS_PER_SOL,
      winner: winnerLamports / LAMPORTS_PER_SOL
    });

    // Create transaction with both transfers
    const transaction = new Transaction();

    // Add transfer to winner (95%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: new PublicKey(winnerWallet),
        lamports: winnerLamports,
      })
    );

    // Add transfer to team (5%)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: TEAM_WALLET,
        lamports: teamFeeLamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;

    console.log('Sending payout transaction...');

    // Sign and send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [treasuryKeypair],
      {
        commitment: 'confirmed',
        maxRetries: 3
      }
    );

    console.log('Payout transaction confirmed:', signature);

    // Update session with payout info
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({
        payout_signature: signature,
        payout_processed_at: new Date().toISOString(),
        team_fee_amount: teamFeeLamports / LAMPORTS_PER_SOL,
        winner_amount: winnerLamports / LAMPORTS_PER_SOL
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update session:', updateError);
      // Transaction succeeded but DB update failed - log for manual reconciliation
      console.error('CRITICAL: Transaction succeeded but DB update failed', {
        signature,
        sessionId,
        winnerId
      });
    }

    console.log('Payout processed successfully');
    return new Response(
      JSON.stringify({ 
        success: true,
        signature,
        winnerAmount: winnerLamports / LAMPORTS_PER_SOL,
        teamFee: teamFeeLamports / LAMPORTS_PER_SOL,
        recipient: winnerWallet,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing payout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});