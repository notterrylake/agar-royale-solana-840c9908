import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Gamepad2, Trophy, Coins, Users, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HowToPlay = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          onClick={() => navigate('/')} 
          variant="ghost" 
          className="mb-6 text-foreground/60 hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Game
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-foreground mb-4">SOLIUM</h1>
          <p className="text-xl text-muted-foreground">Solana PvP Battle Arena</p>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                What is Solium?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3">
              <p>Solium is a PvP cell battle game where players compete to grow the largest cell in a fast-paced arena.</p>
              <p className="font-semibold text-foreground">Play to earn - winner takes the prize pool!</p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Coins className="h-5 w-5 text-muted-foreground" />
                Entry & Prizes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-secondary p-4 rounded-lg text-center border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Entry Fee</p>
                  <p className="text-2xl font-bold text-foreground">0.05 SOL</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg text-center border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Players per Match</p>
                  <p className="text-2xl font-bold text-foreground">3</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg text-center border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Winner Takes</p>
                  <p className="text-2xl font-bold text-foreground">0.15 SOL</p>
                  <p className="text-xs text-muted-foreground">(3x return!)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground">🕹️ How to Play</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <div className="space-y-3">
                <div className="bg-secondary p-3 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-1">🖱️ Move</p>
                  <p>Move your mouse to control your cell's direction</p>
                </div>
                <div className="bg-secondary p-3 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-1">⌨️ Split (SPACE)</p>
                  <p>Press SPACE to split your cell into two for strategic plays</p>
                </div>
                <div className="bg-secondary p-3 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-1">💫 Eject Mass (W)</p>
                  <p>Press W to eject mass - feed teammates or escape danger</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                💡 Tip: Eat smaller cells and food pellets to grow larger. Avoid being eaten by bigger players!
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Trophy className="h-5 w-5 text-muted-foreground" />
                Winning Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3">
              <div className="bg-secondary p-4 rounded-lg border border-border">
                <p className="text-xl font-bold text-foreground mb-2">First to 100 food wins!</p>
                <p>Collect food pellets and consume smaller players to reach the winning score before your opponents.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Game Modes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3">
              <div className="space-y-3">
                <div className="bg-secondary p-3 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-1">⚡ Quick Play</p>
                  <p>Jump into automatic matchmaking with other players for instant action</p>
                </div>
                <div className="bg-secondary p-3 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-1">🔒 Create Private Game</p>
                  <p>Get a unique code to share with friends for a private match</p>
                </div>
                <div className="bg-secondary p-3 rounded-lg border border-border">
                  <p className="font-semibold text-foreground mb-1">🎯 Join Game</p>
                  <p>Enter a friend's code to join their private lobby</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-muted-foreground" />
                Test Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3">
              <div className="bg-secondary p-4 rounded-lg border border-border">
                <p className="font-semibold text-foreground mb-2">Practice for Free</p>
                <p>Toggle test mode to play without spending SOL. Perfect for learning the controls and mechanics before betting real tokens!</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button 
            onClick={() => navigate('/')} 
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Ready to Play
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HowToPlay;
