import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import dogeImg from '@/assets/skin-doge.png';
import pepeImg from '@/assets/skin-pepe.png';
import shibaImg from '@/assets/skin-shiba.png';

interface Player {
  id: string;
  player_name: string;
  wallet_address: string;
  skin_id: number;
  has_paid: boolean;
}

interface GameLobbyProps {
  sessionId: string;
  sessionCode: string;
  onGameStart: () => void;
  onLeaveLobby: () => void;
}

const skinImages = [dogeImg, pepeImg, shibaImg];

export const GameLobby = ({ sessionId, sessionCode, onGameStart, onLeaveLobby }: GameLobbyProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [potAmount, setPotAmount] = useState(0);

  useEffect(() => {
    // Fetch initial players
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .eq('has_paid', true);

      if (error) {
        console.error('Error fetching players:', error);
        return;
      }

      setPlayers(data || []);
      setPotAmount((data?.length || 0) * 0.05);
    };

    fetchPlayers();

    // Subscribe to player updates
    const channel = supabase
      .channel('lobby-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Player update:', payload);
          fetchPlayers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        },
        async (payload: any) => {
          console.log('Session update:', payload);
          
          if (payload.new.game_start_countdown) {
            const countdownTime = new Date(payload.new.game_start_countdown).getTime();
            const now = Date.now();
            const secondsLeft = Math.max(0, Math.floor((countdownTime - now) / 1000));
            setCountdown(secondsLeft);
          }

          if (payload.new.status === 'active') {
            onGameStart();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onGameStart]);

  useEffect(() => {
    // Check if we have 3 players and should start countdown
    const checkAndStartCountdown = async () => {
      if (players.length === 3) {
        const { data: session } = await supabase
          .from('game_sessions')
          .select('game_start_countdown, status')
          .eq('id', sessionId)
          .single();

        if (session && !session.game_start_countdown && session.status === 'waiting') {
          // Start the countdown
          const countdownTime = new Date(Date.now() + 30000); // 30 seconds from now
          
          const { error } = await supabase
            .from('game_sessions')
            .update({
              game_start_countdown: countdownTime.toISOString()
            })
            .eq('id', sessionId);

          if (error) {
            console.error('Error starting countdown:', error);
          } else {
            setCountdown(30);
          }
        } else if (session?.game_start_countdown) {
          const countdownTime = new Date(session.game_start_countdown).getTime();
          const now = Date.now();
          const secondsLeft = Math.max(0, Math.floor((countdownTime - now) / 1000));
          setCountdown(secondsLeft);
        }
      }
    };

    checkAndStartCountdown();
  }, [players.length, sessionId]);

  useEffect(() => {
    // Countdown timer
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      // Start the game
      const startGame = async () => {
        const { error } = await supabase
          .from('game_sessions')
          .update({
            status: 'active',
            started_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (error) {
          console.error('Error starting game:', error);
          toast.error('Failed to start game');
        }
      };
      startGame();
    }
  }, [countdown, sessionId]);

  const handleLeaveLobby = async () => {
    try {
      // Get current player ID from localStorage
      const playerId = localStorage.getItem('recent_player_id');
      if (!playerId) {
        toast.error('Player not found');
        onLeaveLobby();
        return;
      }

      toast.info('Processing refund...');

      // Call refund edge function
      const { data, error } = await supabase.functions.invoke('process-refund', {
        body: { playerId, sessionId }
      });

      if (error || !data?.success) {
        console.error('Refund error:', error || data);
        toast.error('Failed to process refund');
        return;
      }

      toast.success(`Refunded ${data.amount} SOL!`);
      onLeaveLobby();
    } catch (error) {
      console.error('Error leaving lobby:', error);
      toast.error('Failed to leave lobby');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="w-full max-w-4xl p-8 bg-card/50 backdrop-blur border-primary/20">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-foreground">Game Lobby</h1>
          <p className="text-xl text-muted-foreground">Session Code: <span className="text-primary font-mono">{sessionCode}</span></p>
          
          <div className="py-8">
            <div className="text-3xl font-bold text-primary mb-2">
              POT: {potAmount.toFixed(2)} SOL
            </div>
            <div className="text-lg text-muted-foreground">
              Players: {players.length}/3
            </div>
          </div>

          {countdown !== null && (
            <div className="py-4">
              <div className="text-6xl font-bold text-primary animate-pulse">
                {countdown}
              </div>
              <p className="text-lg text-muted-foreground mt-2">Game starting in...</p>
            </div>
          )}

          {countdown === null && (
            <div className="text-lg text-muted-foreground">
              Waiting for players to join...
            </div>
          )}

          <div className="grid grid-cols-3 gap-6 py-8">
            {[0, 1, 2].map((index) => {
              const player = players[index];
              return (
                <div
                  key={index}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    player
                      ? 'border-primary bg-primary/10'
                      : 'border-muted bg-muted/5'
                  }`}
                >
                  {player ? (
                    <div className="space-y-3">
                      <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-primary">
                        <img
                          src={skinImages[player.skin_id] || skinImages[0]}
                          alt={`Player ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-lg font-semibold text-foreground">
                        {player.player_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {player.wallet_address?.slice(0, 4)}...{player.wallet_address?.slice(-4)}
                      </div>
                      <div className="text-sm text-primary font-semibold">
                        ✓ 0.05 SOL
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-24 h-24 mx-auto rounded-full bg-muted/20 flex items-center justify-center">
                        <span className="text-4xl text-muted-foreground">?</span>
                      </div>
                      <div className="text-lg text-muted-foreground">
                        Waiting...
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleLeaveLobby}
            variant="outline"
            size="lg"
            className="mt-4"
          >
            Leave Lobby
          </Button>
        </div>
      </Card>
    </div>
  );
};