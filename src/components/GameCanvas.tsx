import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Leaderboard } from './Leaderboard';
import { WinnerScreen } from './WinnerScreen';
import { PhantomWallet } from './PhantomWallet';
import skinDoge from '@/assets/skin-doge.png';
import skinShiba from '@/assets/skin-shiba.png';
import skinAvatar from '@/assets/skin-avatar.webp';
import skinPepe from '@/assets/skin-pepe.png';

interface Cell {
  x: number;
  y: number;
  radius: number;
  color: string;
  vx: number;
  vy: number;
  isPlayer: boolean;
  name?: string;
  id: string;
}

interface Food {
  x: number;
  y: number;
  color: string;
}

interface Cactus {
  x: number;
  y: number;
  radius: number;
}

interface GameCanvasProps {
  sessionId: string;
  playerId: string;
  sessionCode: string;
  onPlayAgain: () => void;
  selectedSkin: number;
}

const SKIN_IMAGES = [skinDoge, skinShiba, skinAvatar, skinPepe];

const COLORS = [
  '#00ffff', '#ff00ff', '#ff00aa', '#00ff88', '#ffaa00', '#0088ff',
  '#ff0066', '#00ff00', '#ff6600', '#0066ff'
];

const WORLD_SIZE = 3000;
const FOOD_COUNT = 500;
const CACTUS_COUNT = 30;
const MAX_PLAYER_CELLS = 16;
const WIN_CONDITION = 100;

export const GameCanvas = ({ sessionId, playerId, sessionCode, onPlayAgain, selectedSkin }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [playerDied, setPlayerDied] = useState(false);
  const [winner, setWinner] = useState<{ name: string; isMe: boolean; winnerAmount?: number; teamFee?: number; payoutSignature?: string } | null>(null);
  const [potAmount, setPotAmount] = useState(0.15);
  const mousePos = useRef({ x: 0, y: 0 });
  const playerCells = useRef<Cell[]>([]);
  const foods = useRef<Food[]>([]);
  const cacti = useRef<Cactus[]>([]);
  const cameraPos = useRef({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  const cellIdCounter = useRef(0);
  const foodEaten = useRef(0);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });
      
      if (data) setPlayers(data);
    };

    fetchPlayers();

    const channel = supabase
      .channel(`game-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          fetchPlayers();
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const player = payload.new as any;
            if (player.score >= WIN_CONDITION && !gameEnded) {
              handleGameWin(player);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, gameEnded]);

  const handleGameWin = async (winningPlayer: any) => {
    setGameEnded(true);
    const isMe = winningPlayer.id === playerId;

    // Update game session status
    const { data: sessionData } = await supabase
      .from('game_sessions')
      .select('pot_amount')
      .eq('id', sessionId)
      .single();

    const currentPot = sessionData?.pot_amount || 0.15;
    setPotAmount(currentPot);

    await supabase
      .from('game_sessions')
      .update({ status: 'ended', winner_id: winningPlayer.id, ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Process winner payout if this player won
    if (isMe) {
      try {
        toast.info('Processing payout...');
        
        const { data: payoutData, error: payoutError } = await supabase.functions.invoke(
          'process-winner-payout',
          {
            body: {
              sessionId,
              winnerId: playerId,
              winnerWallet: winningPlayer.wallet_address,
              potAmount: currentPot
            }
          }
        );

        if (payoutError || !payoutData?.success) {
          console.error('Payout error:', payoutError || payoutData);
          toast.error('Failed to process payout');
          setWinner({ name: winningPlayer.player_name, isMe });
        } else {
          toast.success(`Payout sent! You won ${payoutData.winnerAmount} SOL!`);
          setWinner({ 
            name: winningPlayer.player_name, 
            isMe,
            winnerAmount: payoutData.winnerAmount,
            teamFee: payoutData.teamFee,
            payoutSignature: payoutData.signature
          });
        }
      } catch (error) {
        console.error('Error processing payout:', error);
        toast.error('Failed to process payout');
        setWinner({ name: winningPlayer.player_name, isMe });
      }
    } else {
      toast.success(`${winningPlayer.player_name} won!`);
      setWinner({ name: winningPlayer.player_name, isMe });
    }
  };

  const updatePlayerScore = async (newScore: number) => {
    await supabase
      .from('players')
      .update({ score: newScore, last_updated: new Date().toISOString() })
      .eq('id', playerId);
  };

  const handlePlayerDeath = async () => {
    await supabase
      .from('players')
      .update({ is_alive: false })
      .eq('id', playerId);
  };

  const initGame = () => {
    cellIdCounter.current = 0;
    foodEaten.current = 0;
    
    const currentPlayer = players.find(p => p.id === playerId);
    
    playerCells.current = [{
      x: WORLD_SIZE / 2,
      y: WORLD_SIZE / 2,
      radius: 20,
      color: COLORS[0],
      vx: 0,
      vy: 0,
      isPlayer: true,
      name: currentPlayer?.player_name || 'You',
      id: `player-${cellIdCounter.current++}`
    }];

    foods.current = Array.from({ length: FOOD_COUNT }, () => ({
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    }));

    cacti.current = Array.from({ length: CACTUS_COUNT }, () => ({
      x: Math.random() * WORLD_SIZE,
      y: Math.random() * WORLD_SIZE,
      radius: 20 + Math.random() * 30
    }));

    setScore(0);
    setGameStarted(true);
    toast.success('Game started! W to eject. SPACE to split.');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameStarted) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && playerCells.current.length > 0) {
        e.preventDefault();
        splitCells();
      }
      if (e.code === 'KeyW' && playerCells.current.length > 0) {
        e.preventDefault();
        ejectMass();
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyPress);

    const ejectMass = () => {
      playerCells.current.forEach(cell => {
        if (cell.radius > 15) {
          const angle = Math.atan2(
            mousePos.current.y - canvas.height / 2,
            mousePos.current.x - canvas.width / 2
          );
          
          const massLoss = 2;
          cell.radius = Math.sqrt(Math.max(0, cell.radius ** 2 - massLoss ** 2));
          
          const ejectDistance = cell.radius + 10;
          foods.current.push({
            x: cell.x + Math.cos(angle) * ejectDistance,
            y: cell.y + Math.sin(angle) * ejectDistance,
            color: cell.color
          });
        }
      });
    };

    const splitCells = () => {
      if (playerCells.current.length >= MAX_PLAYER_CELLS) {
        toast.error('Maximum split reached!');
        return;
      }

      const newCells: Cell[] = [];
      playerCells.current.forEach(cell => {
        if (cell.radius > 20 && newCells.length + playerCells.current.length < MAX_PLAYER_CELLS) {
          const angle = Math.atan2(
            mousePos.current.y - canvas.height / 2,
            mousePos.current.x - canvas.width / 2
          );
          const newRadius = cell.radius / Math.sqrt(2);
          const splitDistance = newRadius * 2;
          
          newCells.push({
            ...cell,
            radius: newRadius,
            id: `player-${cellIdCounter.current++}`
          });
          newCells.push({
            ...cell,
            radius: newRadius,
            x: cell.x + Math.cos(angle) * splitDistance,
            y: cell.y + Math.sin(angle) * splitDistance,
            vx: Math.cos(angle) * 20,
            vy: Math.sin(angle) * 20,
            id: `player-${cellIdCounter.current++}`
          });
        } else {
          newCells.push(cell);
        }
      });
      playerCells.current = newCells;
    };

    const checkCollisions = () => {
      playerCells.current = playerCells.current.filter(cell => {
        for (const cactus of cacti.current) {
          const dist = Math.hypot(cell.x - cactus.x, cell.y - cactus.y);
          if (dist < cell.radius + cactus.radius) {
            toast.error('Hit a cactus!');
            return false;
          }
        }
        return true;
      });

      if (playerCells.current.length === 0 && gameStarted && !gameEnded && !playerDied) {
        setPlayerDied(true);
        handlePlayerDeath();
        setGameStarted(false);
        
        setTimeout(() => {
          onPlayAgain();
        }, 2500);
        return;
      }

      let foodEatenThisFrame = 0;
      playerCells.current.forEach(cell => {
        foods.current = foods.current.filter(food => {
          const dist = Math.hypot(cell.x - food.x, cell.y - food.y);
          if (dist < cell.radius) {
            cell.radius = Math.sqrt(cell.radius ** 2 + 9);
            foodEatenThisFrame++;
            return false;
          }
          return true;
        });
      });

      if (foodEatenThisFrame > 0) {
        foodEaten.current += foodEatenThisFrame;
        const newScore = foodEaten.current;
        setScore(newScore);
        updatePlayerScore(newScore);
        
        if (newScore >= WIN_CONDITION && !gameEnded) {
          const currentPlayer = players.find(p => p.id === playerId);
          if (currentPlayer) {
            handleGameWin(currentPlayer);
          }
        }
      }

      while (foods.current.length < FOOD_COUNT) {
        foods.current.push({
          x: Math.random() * WORLD_SIZE,
          y: Math.random() * WORLD_SIZE,
          color: COLORS[Math.floor(Math.random() * COLORS.length)]
        });
      }
    };

    const gameLoop = () => {
      if (!gameStarted) return;

      playerCells.current.forEach(cell => {
        const dx = mousePos.current.x - canvas.width / 2;
        const dy = mousePos.current.y - canvas.height / 2;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 10) {
          const baseSpeed = 2.5;
          const speedBonus = Math.min(3, foodEaten.current * 0.02);
          const speed = baseSpeed + speedBonus;
          const targetVx = (dx / dist) * speed;
          const targetVy = (dy / dist) * speed;
          
          cell.vx += (targetVx - cell.vx) * 0.15;
          cell.vy += (targetVy - cell.vy) * 0.15;
        } else {
          cell.vx *= 0.9;
          cell.vy *= 0.9;
        }

        cell.x += cell.vx;
        cell.y += cell.vy;

        cell.x = Math.max(cell.radius, Math.min(WORLD_SIZE - cell.radius, cell.x));
        cell.y = Math.max(cell.radius, Math.min(WORLD_SIZE - cell.radius, cell.y));

        cell.vx *= 0.98;
        cell.vy *= 0.98;
      });

      checkCollisions();

      if (playerCells.current.length > 0) {
        const avgX = playerCells.current.reduce((sum, c) => sum + c.x, 0) / playerCells.current.length;
        const avgY = playerCells.current.reduce((sum, c) => sum + c.y, 0) / playerCells.current.length;
        cameraPos.current.x += (avgX - cameraPos.current.x) * 0.1;
        cameraPos.current.y += (avgY - cameraPos.current.y) * 0.1;
      }

      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      const offsetX = cameraPos.current.x % gridSize;
      const offsetY = cameraPos.current.y % gridSize;
      for (let x = -offsetX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = -offsetY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const toScreenX = (x: number) => x - cameraPos.current.x + canvas.width / 2;
      const toScreenY = (y: number) => y - cameraPos.current.y + canvas.height / 2;

      foods.current.forEach(food => {
        const sx = toScreenX(food.x);
        const sy = toScreenY(food.y);
        if (sx > -50 && sx < canvas.width + 50 && sy > -50 && sy < canvas.height + 50) {
          ctx.fillStyle = food.color;
          ctx.beginPath();
          ctx.arc(sx, sy, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      cacti.current.forEach(cactus => {
        const sx = toScreenX(cactus.x);
        const sy = toScreenY(cactus.y);
        if (sx > -100 && sx < canvas.width + 100 && sy > -100 && sy < canvas.height + 100) {
          ctx.fillStyle = '#2d5016';
          ctx.beginPath();
          ctx.arc(sx, sy, cactus.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = '#1a3009';
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(
              sx + Math.cos(angle) * cactus.radius,
              sy + Math.sin(angle) * cactus.radius
            );
            ctx.stroke();
          }
          
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sx, sy, cactus.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      playerCells.current.forEach(cell => {
        const sx = toScreenX(cell.x);
        const sy = toScreenY(cell.y);
        
        if (cell.isPlayer) {
          // Draw skin image for player
          const skinImage = new Image();
          skinImage.src = SKIN_IMAGES[selectedSkin - 1];
          const size = cell.radius * 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(sx, sy, cell.radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(skinImage, sx - cell.radius, sy - cell.radius, size, size);
          ctx.restore();
          
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sx, sy, cell.radius, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Draw normal gradient for non-player cells
          const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, cell.radius);
          gradient.addColorStop(0, cell.color);
          gradient.addColorStop(1, cell.color + '33');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(sx, sy, cell.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = '#ffffff44';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (cell.name) {
          // Draw name with black outline for better visibility on all skins
          const fontSize = Math.max(12, cell.radius / 3);
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw black outline
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 4;
          ctx.strokeText(cell.name, sx, sy);
          
          // Draw white text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(cell.name, sx, sy);
        }
      });

      requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [gameStarted, score, players, playerId, gameEnded]);

  return (
    <div className="relative w-full h-screen bg-background">
      <div className="absolute top-4 left-4 z-20">
        <PhantomWallet />
      </div>

      {!gameStarted && !gameEnded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-6">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Ready to Play
            </h1>
            <p className="text-xl text-muted-foreground">
              Session: {sessionCode}
            </p>
            <p className="text-lg text-muted-foreground">
              First to eat {WIN_CONDITION} food wins!
            </p>
            <button
              onClick={initGame}
              className="px-8 py-4 text-xl font-bold rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
            >
              Start Playing
            </button>
          </div>
        </div>
      )}

      {playerDied && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-background/90 backdrop-blur-md">
          <div className="text-center space-y-4 animate-scale-in">
            <h1 className="text-7xl font-bold text-foreground tracking-tight">
              You Died
            </h1>
            <p className="text-xl text-muted-foreground">
              Food eaten: {Math.floor(score)}
            </p>
            <p className="text-sm text-muted-foreground">
              Returning to lobby...
            </p>
          </div>
        </div>
      )}

      {gameEnded && winner && (
        <WinnerScreen
          winnerName={winner.name}
          isWinner={winner.isMe}
          finalScore={score}
          onPlayAgain={onPlayAgain}
          playerId={playerId}
          potAmount={potAmount}
          winnerAmount={winner.winnerAmount}
          teamFee={winner.teamFee}
          payoutSignature={winner.payoutSignature}
        />
      )}
      
      {gameStarted && !gameEnded && !playerDied && (
        <Leaderboard
          players={players}
          currentPlayerId={playerId}
          sessionCode={sessionCode}
        />
      )}

      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
