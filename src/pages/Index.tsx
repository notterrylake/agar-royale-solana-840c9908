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
  const [matchmakingPlayerName, setMatchmakingPlayerName] = useState<string>('');

  const generateSessionCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleStartGame = async (
    playerName: string, 
    walletAddress: string,
    transactionSignature: string,
    joinCode?: string, 
    skinId: number = 0,
    isQuickPlay: boolean = false
  ) => {
    setSelectedSkin(skinId);

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

      // Call the edge function to create or join game
      toast.info(isQuickPlay ? 'Finding match...' : 'Creating game...');
      
      const { data, error } = await supabase.functions.invoke('create-or-join-game', {
        body: {
          playerName,
          walletAddress,
          transactionSignature,
          skinId,
          sessionCode: joinCode,
          isQuickPlay
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to start game');
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Handle quick play - go to matchmaking
      if (data.mode === 'matchmaking') {
        setMatchmakingQueueId(data.queueId);
        setMatchmakingPlayerName(playerName);
        setGameState('matchmaking');
        toast.success('Searching for match...');
        return;
      }

      // Handle lobby creation/join
      if (data.mode === 'lobby') {
        localStorage.setItem('recent_player_id', data.playerId);
        setSessionId(data.sessionId);
        setSessionCode(data.sessionCode);
        setPlayerId(data.playerId);

        if (!joinCode) {
          toast.success(`Lobby created! Share code: ${data.sessionCode}`);
        } else {
          toast.success('Joined lobby successfully!');
        }

        setGameState('lobby');
      }

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
    setMatchmakingPlayerName('');
  };

  const handleLeaveLobby = () => {
    setGameState('home');
    setSessionId('');
    setSessionCode('');
    setPlayerId('');
    setMatchmakingQueueId('');
    setMatchmakingPlayerName('');
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
    setMatchmakingPlayerName('');
  };

  return (
    <div className="w-full h-screen">
      {gameState === 'home' && (
        <HomeScreen onStartGame={handleStartGame} />
      )}
      {gameState === 'matchmaking' && (
        <MatchmakingScreen
          queueId={matchmakingQueueId}
          playerName={matchmakingPlayerName}
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