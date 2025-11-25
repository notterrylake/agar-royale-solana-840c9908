import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Check, Zap } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface SpinningWheelProps {
  walletPublicKey: PublicKey | null;
}

export const SpinningWheel = ({ walletPublicKey }: SpinningWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winningHash, setWinningHash] = useState<string | null>(null);
  const [showWinDialog, setShowWinDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const SPIN_COST = 0.01; // SOL
  const SLICES = 12;
  const WINNING_SLICE = 6; // Position of the "Airdrop" reward
  const SLICE_ANGLE = 360 / SLICES;

  const playWinSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const generateWinningHash = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const prefix = testMode ? 'TEST-AIRDROP' : 'AIRDROP';
    const hash = `${prefix}-${timestamp}-${randomStr}`.toUpperCase();
    return hash;
  };

  const copyToClipboard = async () => {
    if (winningHash) {
      await navigator.clipboard.writeText(winningHash);
      setCopied(true);
      toast.success('Hash code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSpin = async () => {
    if (!testMode && !walletPublicKey) {
      toast.error('Please connect your Phantom wallet first');
      return;
    }

    if (isSpinning) return;

    let transactionSignature: string | null = null;

    try {
      setIsSpinning(true);

      // Skip payment in test mode
      if (!testMode) {
        // Get Phantom provider
        const provider = (window as any).phantom?.solana;
        if (!provider) {
          toast.error('Phantom wallet not found');
          setIsSpinning(false);
          return;
        }

        // Create Solana connection (mainnet-beta for production, devnet for testing)
        const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

        // Treasury wallet address (replace with your actual wallet)
        const treasuryPublicKey = new PublicKey('11111111111111111111111111111111');

        // Create transaction
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: walletPublicKey!,
            toPubkey: treasuryPublicKey,
            lamports: SPIN_COST * LAMPORTS_PER_SOL,
          })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletPublicKey!;

        // Sign and send transaction
        const signed = await provider.signTransaction(transaction);
        transactionSignature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction(transactionSignature);

        toast.success('Payment successful! Spinning...');
      } else {
        toast.info('Test Mode - No payment required!');
      }

      // Determine result (5% chance to win)
      const isWin = Math.random() < 0.05;
      const targetSlice = isWin ? WINNING_SLICE : Math.floor(Math.random() * (SLICES - 1)) + (WINNING_SLICE >= Math.floor(Math.random() * (SLICES - 1)) ? 1 : 0);
      
      // Calculate rotation
      const spins = 5 + Math.random() * 3; // 5-8 full spins
      const targetAngle = targetSlice * SLICE_ANGLE;
      const finalRotation = rotation + (360 * spins) + targetAngle;

      setRotation(finalRotation);

      // Wait for spin to complete
      setTimeout(async () => {
        setIsSpinning(false);
        const hash = isWin ? generateWinningHash() : null;
        
        // Save spin result to database
        try {
          await supabase.from('spin_results').insert({
            wallet_address: testMode ? 'test-mode' : walletPublicKey!.toString(),
            hash_code: hash,
            is_winner: isWin,
            transaction_signature: transactionSignature,
            spin_cost: SPIN_COST,
            test_mode: testMode
          });
        } catch (error) {
          console.error('Failed to save spin result:', error);
        }
        
        if (isWin) {
          setWinningHash(hash);
          playWinSound();
          triggerConfetti();
          setShowWinDialog(true);
        } else {
          toast.info('Better luck next time!');
        }
      }, 4000);

    } catch (error: any) {
      console.error('Spin error:', error);
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error('Failed to process payment');
      }
      setIsSpinning(false);
    }
  };

  return (
    <>
      <Dialog open={showWinDialog} onOpenChange={setShowWinDialog}>
        <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-3xl font-extrabold uppercase tracking-tight">🎁 Airdrop Won!</DialogTitle>
            <DialogDescription className="text-muted-foreground/80">
              Congratulations! Save this hash code to claim your airdrop reward.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 p-5 rounded-lg border-2 border-green-500/40">
              <p className="text-xs text-muted-foreground/70 mb-3 uppercase tracking-wider">Your Airdrop Hash Code:</p>
              <p className="font-mono text-sm break-all font-bold text-green-400">{winningHash}</p>
            </div>
            <Button
              onClick={copyToClipboard}
              className="w-full h-12 bg-green-500 text-white hover:bg-green-600 font-bold uppercase tracking-wide"
              variant="default"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Hash Code
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground/70 text-center">
              Keep this code safe to claim your airdrop.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="p-8 bg-card/80 backdrop-blur-xl border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div className="space-y-6">
        
        {/* Test Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <Label htmlFor="test-mode" className="text-sm font-medium cursor-pointer">
              Test Mode {testMode && <span className="text-yellow-500">(Active)</span>}
            </Label>
          </div>
          <Switch
            id="test-mode"
            checked={testMode}
            onCheckedChange={setTestMode}
          />
        </div>

        {testMode && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-xs text-yellow-500/90 font-medium text-center">
              🧪 Test mode enabled - No wallet connection or payment required
            </p>
          </div>
        )}
        
        <div className="relative w-64 h-64 mx-auto">
          {/* Wheel container */}
          <div 
            ref={wheelRef}
            className="absolute inset-0 rounded-full border-[6px] border-white shadow-[0_0_60px_rgba(255,255,255,0.2)] overflow-hidden"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            {/* Create slices */}
            {Array.from({ length: SLICES }).map((_, i) => {
              // Define color palette for non-winning slices
              const colors = [
                'hsl(220, 70%, 50%)', // Blue
                'hsl(280, 70%, 50%)', // Purple
                'hsl(340, 70%, 50%)', // Pink
                'hsl(20, 70%, 50%)',  // Orange
                'hsl(50, 70%, 50%)',  // Yellow
                'hsl(180, 70%, 40%)', // Cyan
                'hsl(260, 70%, 55%)', // Violet
                'hsl(10, 70%, 50%)',  // Red
                'hsl(150, 70%, 45%)', // Teal
                'hsl(30, 70%, 50%)',  // Orange-Red
                'hsl(200, 70%, 50%)', // Sky Blue
              ];
              
              // Get color index, skipping the winning slice position
              const colorIndex = i < WINNING_SLICE ? i : i - 1;
              const sliceColor = i === WINNING_SLICE 
                ? 'hsl(142, 76%, 36%)' // Green for winning slice
                : colors[colorIndex % colors.length];
              
              return (
                <div
                  key={i}
                  className="absolute w-full h-full origin-center"
                  style={{
                    transform: `rotate(${i * SLICE_ANGLE}deg)`,
                  }}
                >
                  <div
                    className={`absolute w-0 h-0 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-l-[128px] border-r-[128px] border-b-[128px] ${
                      i === WINNING_SLICE ? 'animate-pulse' : ''
                    }`}
                    style={{
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      borderBottomColor: sliceColor,
                      transform: 'rotate(180deg)',
                      boxShadow: i === WINNING_SLICE ? '0 0 30px rgba(34, 197, 94, 0.6)' : 'none',
                    }}
                  />
                  {i === WINNING_SLICE && (
                    <div
                      className="absolute text-[9px] font-extrabold text-white whitespace-nowrap"
                      style={{
                        top: '58%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(90deg)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      }}
                    >
                      AIRDROP
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Center circle */}
            <div className="absolute inset-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 bg-black rounded-full border-4 border-white flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              <div className="text-[10px] font-extrabold text-white uppercase tracking-wider">SPIN</div>
            </div>
          </div>

          {/* Pointer */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-white z-10 drop-shadow-[0_4px_8px_rgba(255,255,255,0.3)]" />
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground/80 font-medium">
            Cost: <span className="font-bold text-white">
              {testMode ? 'FREE' : `${SPIN_COST} SOL`}
            </span>
            {testMode && <span className="ml-2 text-yellow-500">(Test Mode)</span>}
          </p>
          <Button
            onClick={handleSpin}
            disabled={isSpinning || (!testMode && !walletPublicKey)}
            className="w-full h-14 bg-white text-black hover:bg-white/90 font-bold uppercase tracking-wide shadow-lg disabled:opacity-50"
          >
            {isSpinning ? 'Spinning...' : testMode ? 'Test Spin' : walletPublicKey ? 'Spin the Wheel' : 'Connect Wallet'}
          </Button>
        </div>
      </div>
    </Card>
    </>
  );
};
