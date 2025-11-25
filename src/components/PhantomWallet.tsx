import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { PublicKey } from '@solana/web3.js';

interface PhantomProvider {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: () => void) => void;
  publicKey?: { toString: () => string };
}

interface PhantomWalletProps {
  onWalletChange?: (publicKey: any) => void;
}

export const PhantomWallet = ({ onWalletChange }: PhantomWalletProps) => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string>('');
  const [provider, setProvider] = useState<PhantomProvider | null>(null);

  useEffect(() => {
    const getProvider = (): PhantomProvider | null => {
      if ('phantom' in window) {
        const phantom = (window as any).phantom?.solana;
        if (phantom?.isPhantom) {
          return phantom;
        }
      }
      return null;
    };

    const phantomProvider = getProvider();
    setProvider(phantomProvider);

    if (phantomProvider?.publicKey) {
      setConnected(true);
      const pkString = phantomProvider.publicKey.toString();
      setPublicKey(pkString);
      onWalletChange?.(new PublicKey(pkString));
    }

    phantomProvider?.on('disconnect', () => {
      setConnected(false);
      setPublicKey('');
      onWalletChange?.(null);
    });
  }, [onWalletChange]);

  const connectWallet = async () => {
    if (!provider) {
      toast.error('Phantom wallet not found. Please install Phantom extension.');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    try {
      const response = await provider.connect();
      const pkString = response.publicKey.toString();
      setConnected(true);
      setPublicKey(pkString);
      onWalletChange?.(new PublicKey(pkString));
      toast.success('Wallet connected successfully!');
    } catch (err) {
      toast.error('Failed to connect wallet');
      console.error(err);
    }
  };

  const disconnectWallet = async () => {
    if (provider) {
      try {
        await provider.disconnect();
        setConnected(false);
        setPublicKey('');
        onWalletChange?.(null);
        toast.success('Wallet disconnected');
      } catch (err) {
        toast.error('Failed to disconnect wallet');
        console.error(err);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <>
          <div className="px-4 py-2 rounded-lg bg-card border border-primary/20">
            <p className="text-sm font-mono text-primary">
              {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
            </p>
          </div>
          <Button onClick={disconnectWallet} variant="outline" size="sm">
            Disconnect
          </Button>
        </>
      ) : (
        <Button onClick={connectWallet} className="gap-2 bg-primary hover:bg-primary/90">
          <Wallet className="w-4 h-4" />
          Connect Phantom
        </Button>
      )}
    </div>
  );
};
