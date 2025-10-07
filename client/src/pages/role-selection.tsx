import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);

  // Generate or get user ID
  const getUserId = () => {
    let userId = localStorage.getItem("userId");
    if (!userId) {
      userId = `user_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("userId", userId);
    }
    return userId;
  };

  const handleJoin = async (role: "player" | "spectator") => {
    setIsJoining(true);
    try {
      const userId = getUserId();
      
      // Get or create session ID
      let sessionId = localStorage.getItem("currentSessionId");
      
      // If no session exists, create one
      if (!sessionId) {
        const sessionRes = await apiRequest("POST", "/api/sessions", {});
        const sessionData = await sessionRes.json();
        sessionId = sessionData.id as string;
        localStorage.setItem("currentSessionId", sessionId);
      }

      // Join session with selected role
      if (!sessionId) {
        throw new Error("Session ID not found");
      }
      
      const joinRes = await apiRequest("POST", `/api/sessions/${sessionId}/join`, {
        userId,
        role
      });

      if (!joinRes.ok) {
        const error = await joinRes.json();
        
        if (error.canJoinAsSpectator) {
          toast({
            title: "Игра заполнена",
            description: error.message,
            variant: "destructive",
          });
          setIsJoining(false);
          return;
        }
        
        throw new Error(error.message);
      }

      const participant = await joinRes.json();
      
      // Save participant info
      localStorage.setItem("participantId", participant.id);
      localStorage.setItem("userRole", role);
      if (participant.playerNumber) {
        localStorage.setItem("playerNumber", participant.playerNumber.toString());
      }

      // Redirect to arena
      setLocation("/");
    } catch (error) {
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось присоединиться к игре",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-decorative decorative-text mb-4 tracking-wider">
            МАГИЧЕСКАЯ ДУЭЛЬ
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-serif">
            Выберите свою роль
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Player Card */}
          <Card 
            className="spell-card border-border/20 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
            data-testid="card-role-player"
          >
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-center text-2xl">Игрок</CardTitle>
              <CardDescription className="text-center">
                Участвуйте в магическом поединке
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li>✨ Рисуйте заклинания</li>
                <li>⚔️ Атакуйте противника</li>
                <li>🛡️ Защищайтесь контрзаклинаниями</li>
                <li>🏆 Набирайте очки для победы</li>
              </ul>
              <Button 
                className="w-full" 
                onClick={() => handleJoin("player")}
                disabled={isJoining}
                data-testid="button-join-player"
              >
                {isJoining ? "Присоединение..." : "Присоединиться как игрок"}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Максимум 2 игрока
              </p>
            </CardContent>
          </Card>

          {/* Spectator Card */}
          <Card 
            className="spell-card border-border/20 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20"
            data-testid="card-role-spectator"
          >
            <CardHeader>
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4 mx-auto">
                <Eye className="w-8 h-8 text-secondary" />
              </div>
              <CardTitle className="text-center text-2xl">Наблюдатель</CardTitle>
              <CardDescription className="text-center">
                Следите за ходом битвы
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li>👁️ Наблюдайте за дуэлью</li>
                <li>📊 Видите все заклинания</li>
                <li>🎯 Следите за счетом</li>
                <li>📺 Режим зрителя</li>
              </ul>
              <Button 
                variant="secondary"
                className="w-full" 
                onClick={() => handleJoin("spectator")}
                disabled={isJoining}
                data-testid="button-join-spectator"
              >
                {isJoining ? "Присоединение..." : "Присоединиться как наблюдатель"}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-2">
                Неограниченное количество
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
