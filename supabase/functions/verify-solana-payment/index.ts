import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "npm:@solana/web3.js@1.98.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signature, playerWallet, expectedAmount = 0.05 } = await req.json();
    
    console.log('Verifying payment:', { signature, playerWallet, expectedAmount });

    // Connect to Solana (using devnet for testing)
    const connection = new Connection(
      'https://api.devnet.solana.com',
      'confirmed'
    );

    // Treasury wallet address (you'll need to set this up)
    const TREASURY_WALLET = new PublicKey('5HSvfmyninkzkRdpDwNm6BGiwm9QFMJ4wzFFtEpPmadp'); // Replace with your actual treasury

    // Fetch the transaction
    const transaction = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!transaction) {
      console.error('Transaction not found');
      return new Response(
        JSON.stringify({ verified: false, error: 'Transaction not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Transaction found:', transaction);

    // Verify transaction is confirmed
    if (!transaction.meta || transaction.meta.err) {
      console.error('Transaction failed or not confirmed');
      return new Response(
        JSON.stringify({ verified: false, error: 'Transaction failed or not confirmed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the amount transferred
    const expectedLamports = expectedAmount * LAMPORTS_PER_SOL;
    const preBalances = transaction.meta.preBalances;
    const postBalances = transaction.meta.postBalances;
    
    // Find the transfer amount (simplified check)
    let transferredAmount = 0;
    for (let i = 0; i < preBalances.length; i++) {
      const diff = preBalances[i] - postBalances[i];
      if (diff > 0) {
        transferredAmount = diff;
        break;
      }
    }

    console.log('Transfer amount:', transferredAmount, 'Expected:', expectedLamports);

    // Allow small deviation for transaction fees
    if (transferredAmount < expectedLamports * 0.95) {
      console.error('Amount mismatch');
      return new Response(
        JSON.stringify({ 
          verified: false, 
          error: 'Insufficient payment amount',
          transferred: transferredAmount / LAMPORTS_PER_SOL,
          expected: expectedAmount
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the recipient
    const accountKeys = transaction.transaction.message.getAccountKeys();
    const recipientFound = accountKeys.staticAccountKeys.some(
      key => key.toString() === TREASURY_WALLET.toString()
    );

    if (!recipientFound) {
      console.error('Treasury wallet not found in transaction');
      return new Response(
        JSON.stringify({ verified: false, error: 'Invalid recipient' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All checks passed
    console.log('Payment verified successfully');
    return new Response(
      JSON.stringify({ 
        verified: true,
        amount: transferredAmount / LAMPORTS_PER_SOL,
        signature,
        timestamp: transaction.blockTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ verified: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});