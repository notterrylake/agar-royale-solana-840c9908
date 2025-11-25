import { Trophy, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WinnerScreenProps {
  winnerName: string;
  isWinner: boolean;
  finalScore: number;
  onPlayAgain: () => void;
  playerId: string;
  potAmount?: number;
  winnerAmount?: number;
  teamFee?: number;
  payoutSignature?: string;
}

export const WinnerScreen = ({ winnerName, isWinner, finalScore, onPlayAgain, playerId, potAmount = 0.15, winnerAmount, teamFee, payoutSignature }: WinnerScreenProps) => {
  const [countdown, setCountdown] = useState(5);
  const [canPlayAgain, setCanPlayAgain] = useState(false);

  useEffect(() => {
    // Update the last_game_ended_at timestamp when the winner screen shows
    const updatePlayerEndTime = async () => {
      await supabase
        .from('players')
        .update({ last_game_ended_at: new Date().toISOString() })
        .eq('id', playerId);
    };
    updatePlayerEndTime();

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanPlayAgain(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [playerId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/98 backdrop-blur-2xl">
      <Card className="p-14 max-w-xl w-full space-y-10 bg-card/90 backdrop-blur-xl shadow-[0_0_100px_rgba(255,255,255,0.1)] border-white/10 animate-scale-in">
        <div className="text-center space-y-8">
          <Trophy className="w-24 h-24 mx-auto text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
          
          {isWinner ? (
            <>
              <h1 className="text-7xl font-extrabold text-white tracking-tighter uppercase" style={{ letterSpacing: '-0.05em' }}>
                Victory
              </h1>
              <div className="space-y-3">
                <div className="inline-block px-6 py-3 rounded-full bg-primary/30 border-2 border-primary">
                  <span className="text-3xl font-extrabold text-primary">
                    WON {winnerAmount ? winnerAmount.toFixed(4) : (potAmount * 0.95).toFixed(4)} SOL!
                  </span>
                </div>
                {teamFee && (
                  <p className="text-sm text-muted-foreground">
                    (Total pot: {potAmount.toFixed(4)} SOL - {teamFee.toFixed(4)} SOL team fee)
                  </p>
                )}
                {payoutSignature && (
                  <a
                    href={`https://explorer.solana.com/tx/${payoutSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:text-primary/80 underline block"
                  >
                    View transaction on Solana Explorer
                  </a>
                )}
              </div>
              <p className="text-xl text-white/70 font-light">You are the champion!</p>
            </>
          ) : (
            <>
              <h1 className="text-7xl font-extrabold text-white tracking-tighter uppercase" style={{ letterSpacing: '-0.05em' }}>
                Game Over
              </h1>
              <p className="text-2xl text-white/70 font-light">{winnerName} Won!</p>
            </>
          )}
          
          <div className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] mb-2">Final Score</p>
            <p className="text-6xl font-extrabold text-white">{Math.floor(finalScore)}</p>
          </div>
        </div>

        <div className="space-y-4">
          {!canPlayAgain && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground/70 text-sm">
              <Clock className="w-4 h-4" />
              <p className="font-medium">Please wait {countdown} second{countdown !== 1 ? 's' : ''} before starting a new game</p>
            </div>
          )}
          
          <Button
            onClick={onPlayAgain}
            disabled={!canPlayAgain}
            className="w-full h-14 text-base font-bold bg-white text-black hover:bg-white/90 gap-3 uppercase tracking-wide shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-5 h-5" />
            {canPlayAgain ? 'Play Again' : `Wait ${countdown}s`}
          </Button>
        </div>
      </Card>
    </div>
  );
};
