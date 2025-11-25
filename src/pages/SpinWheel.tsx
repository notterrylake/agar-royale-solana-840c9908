import { useState } from 'react';
import { SpinningWheel } from '@/components/SpinningWheel';
import { PhantomWallet } from '@/components/PhantomWallet';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PublicKey } from '@solana/web3.js';

export default function SpinWheel() {
  const [walletPublicKey, setWalletPublicKey] = useState<PublicKey | null>(null);
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="absolute top-6 left-6">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          size="sm"
          className="gap-2 text-foreground/60 hover:text-foreground hover:bg-white/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Game
        </Button>
      </div>

      <div className="absolute top-6 right-6">
        <PhantomWallet onWalletChange={setWalletPublicKey} />
      </div>

      <div className="flex flex-col items-center gap-10">
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-extrabold text-white tracking-tighter uppercase" style={{ letterSpacing: '-0.05em' }}>Lucky Wheel</h1>
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
        <SpinningWheel walletPublicKey={walletPublicKey} />
      </div>
    </div>
  );
}
