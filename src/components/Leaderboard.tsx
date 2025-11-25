import { Trophy, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Player {
  id: string;
  player_name: string;
  score: number;
  is_alive: boolean;
}

interface LeaderboardProps {
  players: Player[];
  currentPlayerId?: string;
  sessionCode?: string;
}

export const Leaderboard = ({ players, currentPlayerId, sessionCode }: LeaderboardProps) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score).slice(0, 10);

  return (
    <div className="fixed top-4 right-4 w-56 space-y-2 z-20">
      {sessionCode && (
        <Card className="p-2 bg-card/40 backdrop-blur-sm border-border/30">
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Code</p>
            <p className="text-xs font-semibold font-mono tracking-wide text-foreground">{sessionCode}</p>
          </div>
        </Card>
      )}
      
      <Card className="p-3 bg-card/40 backdrop-blur-sm border-border/30">
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy className="w-3.5 h-3.5 text-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Top 10</h3>
        </div>
        
        <div className="space-y-1">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-1.5 rounded transition-all ${
                player.id === currentPlayerId
                  ? 'bg-primary/15 border border-primary/50'
                  : 'bg-muted/20'
              } ${!player.is_alive ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-4">
                  {index === 0 ? (
                    <Crown className="w-3 h-3 text-foreground" />
                  ) : (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-xs truncate max-w-[100px] text-foreground leading-tight">
                    {player.player_name}
                    {player.id === currentPlayerId && (
                      <span className="text-[9px] text-primary ml-1">(You)</span>
                    )}
                  </p>
                  {!player.is_alive && (
                    <p className="text-[9px] text-destructive leading-tight">Out</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-xs text-foreground">
                  {Math.floor(player.score)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {sortedPlayers.length === 0 && (
          <p className="text-center text-muted-foreground text-xs py-3">
            No players
          </p>
        )}
      </Card>
    </div>
  );
};
