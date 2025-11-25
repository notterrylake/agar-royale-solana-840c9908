import { useState } from 'react';
import { GameCanvas } from '@/components/GameCanvas';
import { HomeScreen } from '@/components/HomeScreen';
import { GameLobby } from '@/components/GameLobby';
import { MatchmakingScreen } from '@/components/MatchmakingScreen';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type GameState = 'home' | 'matchmaking' | 'lobby' | 'playing';

const Index = () => {
  const [gameState, setGameState] = useState<GameState>('home');
  const [sessionId, setSessionId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [selectedSkin, setSelectedSkin] = useState<number>(0);
  const [matchmakingQueueId, setMatchmakingQueueId] = useState<string>('');

  const generateSessionCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleStartGame = async (
    playerName: string, 
    walletAddress: string,
    transactionSignature: string,
    joinCode?: string, 
    skinId: number = 0
  ) => {
    setSelectedSkin(skinId);
    
    // Check if player has recently played
    const recentPlayerId = localStorage.getItem('recent_player_id');
    if (recentPlayerId) {
      const { data: playerData } = await supabase
        .from('players')
        .select('last_game_ended_at')
        .eq('id', recentPlayerId)
        .single();

      if (playerData?.last_game_ended_at) {
        const cooldownEnd = new Date(playerData.last_game_ended_at).getTime() + 5000;
        const now = Date.now();
        
        if (now < cooldownEnd) {
          const secondsLeft = Math.ceil((cooldownEnd - now) / 1000);
          toast.error(`Please wait ${secondsLeft} seconds before starting a new game`);
          return;
        }
      }
    }

    try {
      // Skip payment verification in test mode (when signature starts with "test_")
      const isTestMode = transactionSignature.startsWith('test_');
      
      if (!isTestMode) {
        // Verify the payment
        toast.info('Verifying payment...');
        const { data: verificationData, error: verificationError } = await supabase.functions.invoke(
          'verify-solana-payment',
          {
            body: {
              signature: transactionSignature,
              playerWallet: walletAddress,
              expectedAmount: 0.05
            }
          }
        );

        if (verificationError || !verificationData?.verified) {
          toast.error('Payment verification failed');
          console.error('Verification error:', verificationError || verificationData);
          return;
        }

        toast.success('Payment verified!');
      } else {
        toast.success('Test mode - Payment skipped');
      }

      let currentSessionId: string;
      let currentSessionCode: string;

      if (joinCode) {
        // Join existing session - ANTI-CHEAT: Check for duplicate wallet
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('wallet_address', walletAddress)
          .eq('session_id', joinCode)
          .maybeSingle();

        if (existingPlayer) {
          toast.error('This wallet is already in this game');
          return;
        }
        // Join existing session
        const { data: sessionData, error: sessionError } = await supabase
          .from('game_sessions')
          .select('id, status, pot_amount')
          .eq('session_code', joinCode.toUpperCase())
          .single();

        if (sessionError || !sessionData) {
          toast.error('Game session not found');
          return;
        }

        if (sessionData.status !== 'waiting') {
          toast.error('This game has already started');
          return;
        }

        // Update pot amount
        await supabase
          .from('game_sessions')
          .update({ pot_amount: (sessionData.pot_amount || 0) + 0.05 })
          .eq('id', sessionData.id);

        currentSessionId = sessionData.id;
        currentSessionCode = joinCode.toUpperCase();
      } else {
        // Create new session
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
          toast.error('Failed to create game session');
          return;
        }

        currentSessionId = sessionData.id;
      }

      // Create player - ANTI-CHEAT: Database will prevent duplicate wallets/signatures
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
        // Check for duplicate wallet or transaction
        if (playerError.code === '23505') {
          if (playerError.message.includes('unique_wallet_per_session')) {
            toast.error('This wallet is already in this game');
          } else if (playerError.message.includes('unique_transaction_signature')) {
            toast.error('This transaction has already been used');
          } else {
            toast.error('Failed to join game - duplicate entry');
          }
        } else {
          toast.error('Failed to join game');
        }
        console.error('Player creation error:', playerError);
        return;
      }

      if (!playerData) {
        toast.error('Failed to join game');
        return;
      }

      localStorage.setItem('recent_player_id', playerData.id);
      setSessionId(currentSessionId);
      setSessionCode(currentSessionCode);
      setPlayerId(playerData.id);

      if (!joinCode) {
        toast.success(`Lobby created! Share code: ${currentSessionCode}`);
      } else {
        toast.success('Joined lobby successfully!');
      }

      setGameState('lobby');
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start game');
    }
  };

  const handlePlayAgain = () => {
    setGameState('home');
    setSessionId('');
    setSessionCode('');
    setPlayerId('');
    setMatchmakingQueueId('');
  };

  const handleLeaveLobby = () => {
    setGameState('home');
    setSessionId('');
    setSessionCode('');
    setPlayerId('');
    setMatchmakingQueueId('');
  };

  const handleGameStart = () => {
    setGameState('playing');
  };

  const handleMatchFound = (foundSessionId: string, foundSessionCode: string, foundPlayerId: string) => {
    setSessionId(foundSessionId);
    setSessionCode(foundSessionCode);
    setPlayerId(foundPlayerId);
    localStorage.setItem('recent_player_id', foundPlayerId);
    setGameState('lobby');
    toast.success('Match found!');
  };

  const handleCancelMatchmaking = () => {
    setGameState('home');
    setMatchmakingQueueId('');
  };

  return (
    <div className="w-full h-screen">
      {gameState === 'home' && (
        <HomeScreen onStartGame={handleStartGame} />
      )}
      {gameState === 'matchmaking' && (
        <MatchmakingScreen
          queueId={matchmakingQueueId}
          playerName=""
          onMatchFound={handleMatchFound}
          onCancel={handleCancelMatchmaking}
        />
      )}
      {gameState === 'lobby' && (
        <GameLobby
          sessionId={sessionId}
          sessionCode={sessionCode}
          onGameStart={handleGameStart}
          onLeaveLobby={handleLeaveLobby}
        />
      )}
      {gameState === 'playing' && (
        <GameCanvas
          sessionId={sessionId}
          playerId={playerId}
          sessionCode={sessionCode}
          onPlayAgain={handlePlayAgain}
          selectedSkin={selectedSkin}
        />
      )}
    </div>
  );
};

export default Index;