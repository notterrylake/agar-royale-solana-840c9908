import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Gamepad2, Trophy, Coins, Users, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HowToPlay = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <Button 
          onClick={() => navigate('/')} 
          variant="ghost" 
          className="mb-6 text-white hover:text-purple-300"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Game
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">SOLIUM</h1>
          <p className="text-xl text-purple-300">Solana PvP Battle Arena</p>
        </div>

        <div className="space-y-6">
          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-purple-400" />
                What is Solium?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-3">
              <p>Solium is a PvP cell battle game where players compete to grow the largest cell in a fast-paced arena.</p>
              <p className="font-semibold text-purple-300">Play to earn - winner takes the prize pool!</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-400" />
                Entry & Prizes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-3">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-purple-900/30 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-400 mb-1">Entry Fee</p>
                  <p className="text-2xl font-bold text-purple-300">0.05 SOL</p>
                </div>
                <div className="bg-purple-900/30 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-400 mb-1">Players per Match</p>
                  <p className="text-2xl font-bold text-purple-300">3</p>
                </div>
                <div className="bg-purple-900/30 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-400 mb-1">Winner Takes</p>
                  <p className="text-2xl font-bold text-yellow-400">0.15 SOL</p>
                  <p className="text-xs text-yellow-300">(3x return!)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">🕹️ How to Play</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-4">
              <div className="space-y-3">
                <div className="bg-purple-900/20 p-3 rounded-lg">
                  <p className="font-semibold text-purple-300 mb-1">🖱️ Move</p>
                  <p>Move your mouse to control your cell's direction</p>
                </div>
                <div className="bg-purple-900/20 p-3 rounded-lg">
                  <p className="font-semibold text-purple-300 mb-1">⌨️ Split (SPACE)</p>
                  <p>Press SPACE to split your cell into two for strategic plays</p>
                </div>
                <div className="bg-purple-900/20 p-3 rounded-lg">
                  <p className="font-semibold text-purple-300 mb-1">💫 Eject Mass (W)</p>
                  <p>Press W to eject mass - feed teammates or escape danger</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                💡 Tip: Eat smaller cells and food pellets to grow larger. Avoid being eaten by bigger players!
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400" />
                Winning Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-3">
              <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500/30">
                <p className="text-xl font-bold text-yellow-300 mb-2">First to 100 food wins!</p>
                <p>Collect food pellets and consume smaller players to reach the winning score before your opponents.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Game Modes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-3">
              <div className="space-y-3">
                <div className="bg-blue-900/20 p-3 rounded-lg">
                  <p className="font-semibold text-blue-300 mb-1">⚡ Quick Play</p>
                  <p>Jump into automatic matchmaking with other players for instant action</p>
                </div>
                <div className="bg-blue-900/20 p-3 rounded-lg">
                  <p className="font-semibold text-blue-300 mb-1">🔒 Create Private Game</p>
                  <p>Get a unique code to share with friends for a private match</p>
                </div>
                <div className="bg-blue-900/20 p-3 rounded-lg">
                  <p className="font-semibold text-blue-300 mb-1">🎯 Join Game</p>
                  <p>Enter a friend's code to join their private lobby</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-green-400" />
                Test Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300 space-y-3">
              <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                <p className="font-semibold text-green-300 mb-2">Practice for Free</p>
                <p>Toggle test mode to play without spending SOL. Perfect for learning the controls and mechanics before betting real tokens!</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button 
            onClick={() => navigate('/')} 
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Ready to Play
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HowToPlay;
