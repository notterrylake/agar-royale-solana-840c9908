import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PhantomWallet } from '@/components/PhantomWallet';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wallet } from 'lucide-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection, Keypair } from '@solana/web3.js';
import skinDoge from '@/assets/skin-doge.png';
import skinShiba from '@/assets/skin-shiba.png';
import skinAvatar from '@/assets/skin-avatar.webp';
import skinPepe from '@/assets/skin-pepe.png';

interface HomeScreenProps {
  onStartGame: (
    playerName: string,
    walletAddress: string,
    transactionSignature: string,
    sessionCode?: string,
    selectedSkin?: number,
    isQuickPlay?: boolean
  ) => void;
}

export const HomeScreen = ({ onStartGame }: HomeScreenProps) => {
  const [playerName, setPlayerName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [selectedSkin, setSelectedSkin] = useState<number>(0);
  const [walletPublicKey, setWalletPublicKey] = useState<PublicKey | null>(null);
  const [processing, setProcessing] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const navigate = useNavigate();

  // Treasury wallet - Replace with your actual treasury address
  const TREASURY_WALLET = new PublicKey('5HSvfmyninkzkRdpDwNm6BGiwm9QFMJ4wzFFtEpPmadp');
  const BET_AMOUNT = 0.05;

  const handlePaymentAndJoin = async (joinCode?: string, isQuickPlay: boolean = false) => {
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (joinCode && !sessionCode.trim()) {
      toast.error('Please enter a session code');
      return;
    }

    // TEST MODE: Skip payment
    if (testMode) {
      const mockSignature = `test_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const mockWallet = walletPublicKey?.toString() || `test_wallet_${Math.random().toString(36).substring(2)}`;
      
      onStartGame(
        playerName,
        mockWallet,
        mockSignature,
        joinCode ? sessionCode.toUpperCase() : undefined,
        selectedSkin,
        isQuickPlay
      );
      return;
    }

    // REAL MODE: Require wallet and payment
    if (!walletPublicKey) {
      toast.error('Please connect your Phantom wallet first');
      return;
    }

    setProcessing(true);

    try {
      // Get Phantom provider
      const provider = (window as any).phantom?.solana;
      if (!provider || !provider.isPhantom) {
        toast.error('Phantom wallet not found');
        setProcessing(false);
        return;
      }

      // Connect to Solana devnet
      const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: walletPublicKey,
          toPubkey: TREASURY_WALLET,
          lamports: BET_AMOUNT * LAMPORTS_PER_SOL,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = walletPublicKey;

      toast.info('Confirm transaction in Phantom wallet...');

      // Sign and send transaction
      const signed = await provider.signAndSendTransaction(transaction);
      const signature = signed.signature;

      toast.info('Transaction sent, waiting for confirmation...');

      // Wait for confirmation
      await connection.confirmTransaction(signature);

      toast.success('Payment confirmed!');

      // Call the parent handler with payment details
      onStartGame(
        playerName,
        walletPublicKey.toString(),
        signature,
        joinCode ? sessionCode.toUpperCase() : undefined,
        selectedSkin,
        isQuickPlay
      );
    } catch (error: any) {
      console.error('Payment error:', error);
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled');
      } else {
        toast.error('Payment failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setProcessing(false);
    }
  };

  const skins = [
    { id: 0, name: 'Doge', image: skinDoge },
    { id: 1, name: 'Shiba Inu', image: skinShiba },
    { id: 2, name: 'Avatar', image: skinAvatar },
    { id: 3, name: 'Pepe', image: skinPepe },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="absolute top-6 left-6">
        <Button
          onClick={() => navigate('/spin-wheel')}
          variant="ghost"
          size="sm"
          className="gap-2 text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
        >
          <Sparkles className="h-4 w-4" />
          Lucky Wheel
        </Button>
      </div>

      <div className="absolute top-6 right-6">
        <PhantomWallet onWalletChange={setWalletPublicKey} />
      </div>

      <div className="w-full max-w-lg space-y-12 px-6">
        <div className="text-center space-y-3">
          <h1 className="text-8xl font-extrabold text-foreground tracking-tighter animate-fade-in" style={{ letterSpacing: '-0.05em' }}>
            AGAR.IO
          </h1>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.2em]">
            PvP Cell Battle Arena
          </p>
          {!testMode && (
            <div className="inline-block px-4 py-2 rounded-full bg-primary/20 border border-primary/50">
              <span className="text-lg font-bold text-primary">0.05 SOL to Play</span>
            </div>
          )}
          {testMode && (
            <div className="inline-block px-4 py-2 rounded-full bg-green-500/20 border border-green-500/50">
              <span className="text-lg font-bold text-green-500">TEST MODE - Free Play</span>
            </div>
          )}
        </div>

        {mode === 'menu' && (
          <Card className="p-10 space-y-5 bg-card/80 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10 animate-scale-in">
            <div className="flex items-center justify-center gap-2 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-muted-foreground">Enable Test Mode (No Payment)</span>
              </label>
            </div>
            
            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="h-12 text-base bg-white/5 border-white/10 focus:border-white/30 placeholder:text-muted-foreground/50"
              maxLength={20}
            />

            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Choose Your Skin</label>
              <div className="grid grid-cols-4 gap-3">
                {skins.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => setSelectedSkin(skin.id)}
                    className={`aspect-square rounded-xl overflow-hidden bg-white/5 border-2 transition-all ${
                      selectedSkin === skin.id
                        ? 'border-white scale-110 shadow-2xl'
                        : 'border-white/10 opacity-50 hover:opacity-75 hover:scale-105'
                    }`}
                    aria-label={skin.name}
                  >
                    <img src={skin.image} alt={skin.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => handlePaymentAndJoin(undefined, true)}
              className="w-full h-14 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg uppercase tracking-wide"
              disabled={!testMode && !walletPublicKey}
            >
              {!testMode && !walletPublicKey && <Wallet className="mr-2 h-5 w-5" />}
              Quick Play (Find Match)
            </Button>
            <Button
              onClick={() => setMode('create')}
              variant="outline"
              className="w-full h-14 text-base font-bold border-white/20 hover:bg-white/10 hover:border-white/40 transition-all uppercase tracking-wide"
              disabled={!testMode && !walletPublicKey}
            >
              {!testMode && !walletPublicKey && <Wallet className="mr-2 h-5 w-5" />}
              Create Private Game
            </Button>
            <Button
              onClick={() => setMode('join')}
              variant="outline"
              className="w-full h-14 text-base font-bold border-white/20 hover:bg-white/10 hover:border-white/40 transition-all uppercase tracking-wide"
              disabled={!testMode && !walletPublicKey}
            >
              {!testMode && !walletPublicKey && <Wallet className="mr-2 h-5 w-5" />}
              Join Existing Game
            </Button>
            {!testMode && !walletPublicKey && (
              <p className="text-center text-sm text-muted-foreground">
                Connect your Phantom wallet to play
              </p>
            )}
            {testMode && (
              <p className="text-center text-sm text-green-500">
                Test mode enabled - No wallet or payment required
              </p>
            )}
            <div className="pt-6 space-y-2 text-center text-xs text-muted-foreground/80">
              <p className="font-medium">• 3 players per game</p>
              <p className="font-medium">• Winner takes all (0.15 SOL)</p>
              <p className="font-medium">• First to eat 100 food wins</p>
              <p className="font-medium">• Press W to eject mass</p>
              <p className="font-medium">• Press SPACE to split</p>
            </div>
          </Card>
        )}

        {mode === 'create' && (
          <Card className="p-10 space-y-6 bg-card/80 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10 animate-scale-in">
            <h2 className="text-3xl font-extrabold text-center text-foreground uppercase tracking-tight">Create Game</h2>
            
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Choose Your Skin</label>
              <div className="grid grid-cols-4 gap-3">
                {skins.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => setSelectedSkin(skin.id)}
                    className={`aspect-square rounded-xl overflow-hidden bg-white/5 border-2 transition-all ${
                      selectedSkin === skin.id
                        ? 'border-white scale-110 shadow-2xl'
                        : 'border-white/10 opacity-50 hover:opacity-75 hover:scale-105'
                    }`}
                    aria-label={skin.name}
                  >
                    <img src={skin.image} alt={skin.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="h-12 text-base bg-white/5 border-white/10 focus:border-white/30 placeholder:text-muted-foreground/50"
              maxLength={20}
            />

            {!testMode && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-center text-muted-foreground">
                  You will pay <span className="font-bold text-primary">0.05 SOL</span> to enter the game
                </p>
              </div>
            )}

            {testMode && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-center text-green-500 font-semibold">
                  TEST MODE: No payment required
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={() => handlePaymentAndJoin()}
                className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold uppercase tracking-wide shadow-lg"
                disabled={processing || (!testMode && !walletPublicKey)}
              >
                {processing ? 'Processing...' : testMode ? 'Create Test Lobby' : 'Pay & Create Lobby'}
              </Button>
              <Button
                onClick={() => setMode('menu')}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground hover:bg-white/5"
                disabled={processing}
              >
                Back
              </Button>
            </div>
          </Card>
        )}

        {mode === 'join' && (
          <Card className="p-10 space-y-6 bg-card/80 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/10 animate-scale-in">
            <h2 className="text-3xl font-extrabold text-center text-foreground uppercase tracking-tight">Join Game</h2>
            
            <div className="space-y-3">
              <label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Choose Your Skin</label>
              <div className="grid grid-cols-4 gap-3">
                {skins.map((skin) => (
                  <button
                    key={skin.id}
                    onClick={() => setSelectedSkin(skin.id)}
                    className={`aspect-square rounded-xl overflow-hidden bg-white/5 border-2 transition-all ${
                      selectedSkin === skin.id
                        ? 'border-white scale-110 shadow-2xl'
                        : 'border-white/10 opacity-50 hover:opacity-75 hover:scale-105'
                    }`}
                    aria-label={skin.name}
                  >
                    <img src={skin.image} alt={skin.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="h-12 text-base bg-white/5 border-white/10 focus:border-white/30 placeholder:text-muted-foreground/50"
              maxLength={20}
            />
            <Input
              placeholder="Enter session code"
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
              className="h-12 text-base font-mono tracking-[0.3em] text-center bg-white/5 border-white/10 focus:border-white/30 placeholder:text-muted-foreground/50"
              maxLength={6}
            />

            {!testMode && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-center text-muted-foreground">
                  You will pay <span className="font-bold text-primary">0.05 SOL</span> to join the game
                </p>
              </div>
            )}

            {testMode && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-center text-green-500 font-semibold">
                  TEST MODE: No payment required
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={() => handlePaymentAndJoin('join')}
                className="w-full h-12 bg-white text-black hover:bg-white/90 font-bold uppercase tracking-wide shadow-lg"
                disabled={processing || (!testMode && !walletPublicKey)}
              >
                {processing ? 'Processing...' : testMode ? 'Join Test Lobby' : 'Pay & Join Lobby'}
              </Button>
              <Button
                onClick={() => setMode('menu')}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground hover:bg-white/5"
                disabled={processing}
              >
                Back
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};