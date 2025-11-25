import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface MatchmakingScreenProps {
  queueId: string;
  playerName: string;
  onMatchFound: (sessionId: string, sessionCode: string, playerId: string) => void;
  onCancel: () => void;
}

export const MatchmakingScreen = ({ queueId, playerName, onMatchFound, onCancel }: MatchmakingScreenProps) => {
  const [playersInQueue, setPlayersInQueue] = useState(1);
  const [estimatedTime, setEstimatedTime] = useState('Looking for players...');

  useEffect(() => {
    // Subscribe to queue updates
    const checkQueue = async () => {
      const { count } = await supabase
        .from('matchmaking_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'searching');

      setPlayersInQueue(count || 1);

      if (count && count >= 3) {
        setEstimatedTime('Match found! Creating game...');
      } else if (count === 2) {
        setEstimatedTime('1 more player needed');
      } else {
        setEstimatedTime('Looking for players...');
      }
    };

    checkQueue();

    const channel = supabase
      .channel('matchmaking-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matchmaking_queue'
        },
        () => {
          checkQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Check if we've been matched
    const checkMatched = async () => {
      const { data } = await supabase
        .from('matchmaking_queue')
        .select('status')
        .eq('id', queueId)
        .single();

      if (data?.status === 'matched') {
        // Find our player record to get session info
        const { data: player } = await supabase
          .from('players')
          .select('id, session_id, game_sessions(session_code)')
          .eq('player_name', playerName)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (player && player.session_id) {
          const sessionCode = (player.game_sessions as any)?.session_code;
          onMatchFound(player.session_id, sessionCode, player.id);
        }
      }
    };

    const interval = setInterval(checkMatched, 1000);
    return () => clearInterval(interval);
  }, [queueId, playerName, onMatchFound]);

  const handleCancel = async () => {
    // Remove from queue
    await supabase
      .from('matchmaking_queue')
      .delete()
      .eq('id', queueId);

    toast.info('Matchmaking cancelled');
    onCancel();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="w-full max-w-2xl p-12 bg-card/50 backdrop-blur border-primary/20">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            <h1 className="text-4xl font-bold text-foreground">Finding Match</h1>
            <p className="text-xl text-muted-foreground">{estimatedTime}</p>
          </div>

          <div className="py-8">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                <span className="text-3xl font-bold text-primary">{playersInQueue}/3</span>
              </div>
              <span className="text-lg text-muted-foreground">players in queue</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2 max-w-xs mx-auto">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`flex-1 h-3 rounded-full transition-all ${
                    index < playersInQueue
                      ? 'bg-primary animate-pulse'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              {playersInQueue === 1 && 'Searching for opponents...'}
              {playersInQueue === 2 && 'Almost there! One more player needed'}
              {playersInQueue >= 3 && 'Creating game lobby...'}
            </p>
          </div>

          <Button
            onClick={handleCancel}
            variant="outline"
            size="lg"
            className="mt-8"
          >
            Cancel Search
          </Button>
        </div>
      </Card>
    </div>
  );
};