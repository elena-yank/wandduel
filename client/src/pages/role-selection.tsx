import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GAME_VERSION } from "@shared/config";
import { apiRequest, apiUrl } from "@/lib/queryClient";
import playerIconPath from "@assets/magician.png";
import spectatorIconPath from "@assets/spectator.png";
import magicWandIconPath from "@assets/magic-wand.png";
import defenceIconPath from "@assets/defence.png";
import highScoreIconPath from "@assets/high-score.png";
import binocularsIconPath from "@assets/binoculars.png";
import scoreboardIconPath from "@assets/scoreboard.png";
import { useIsPhone } from "@/hooks/use-phone";

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/rooms/:roomId/role-selection");
  const [isJoining, setIsJoining] = useState(false);
  const isPhone = useIsPhone();

  const roomId = params?.roomId;

  // Generate unique user ID for each window/tab
  const getUserId = () => {
    // Use sessionStorage for tab-specific ID + timestamp for uniqueness
    let userId = sessionStorage.getItem("userId");
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("userId", userId);
    }
    return userId;
  };

  const handleJoin = async (role: "player" | "spectator") => {
    if (!roomId) {
      // Убраны всплывающие оповещения: не показываем тост
      console.warn("ID комнаты не найден");
      return;
    }

    setIsJoining(true);
    try {
      const userId = getUserId();
      const userName = localStorage.getItem("userName") || "Player";
      const userHouse = localStorage.getItem("userHouse") || "gryffindor";
      
      // Get session for this room
      const sessionRes = await fetch(apiUrl(`/api/rooms/${roomId}/session`));
      if (!sessionRes.ok) {
        throw new Error("Сессия комнаты не найдена");
      }
      const session = await sessionRes.json();
      const sessionId = session.id;

      // Join session with selected role and house
      const joinRes = await apiRequest("POST", `/api/sessions/${sessionId}/join`, {
        userId,
        userName,
        role,
        house: userHouse
      });

      if (!joinRes.ok) {
        const error = await joinRes.json();
        
        if (error.canJoinAsSpectator) {
          // Убраны всплывающие оповещения: не показываем тост
          console.warn(error.message);
          setIsJoining(false);
          return;
        }
        
        throw new Error(error.message);
      }

      const participant = await joinRes.json();
      
      // Save participant info with room-scoped keys
      localStorage.setItem(`participantId:${roomId}`, participant.id);
      localStorage.setItem(`userRole:${roomId}`, role);
      localStorage.setItem(`currentSessionId:${roomId}`, sessionId);
      if (participant.playerNumber) {
        localStorage.setItem(`playerNumber:${roomId}`, participant.playerNumber.toString());
      }

      // Redirect to arena for this room
      setLocation(`/rooms/${roomId}/arena`);
    } catch (error) {
      // Убраны всплывающие оповещения: не показываем тост
      console.warn(error instanceof Error ? error.message : "Не удалось присоединиться к игре");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="phone-safe-area min-h-screen flex items-center justify-center px-3 py-2 sm:p-4">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-angst mb-3 sm:mb-4 tracking-wider bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
            МАГИЧЕСКАЯ ДУЭЛЬ
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-serif">
            Выберите свою роль
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {/* Player Card */}
          <Card 
            className="spell-card border-border/20 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 relative flex flex-col h-full"
            data-testid="card-role-player"
          >
            <span className="absolute top-2 left-2 text-xs md:text-sm text-muted-foreground">Версия {`v${GAME_VERSION}`}</span>
            <CardHeader>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1 sm:mb-2 mx-auto">
                <img src={playerIconPath} alt="Игрок" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
              </div>
              <CardTitle className="text-center text-xl sm:text-2xl">Игрок</CardTitle>
              {!isPhone && (
                <CardDescription className="text-center text-sm">
                  Участвуйте в магическом поединке
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="grid grid-cols-2 gap-x-6 mb-4 sm:mb-6 text-sm text-muted-foreground">
                <ul className="space-y-1.5 sm:space-y-2">
                  <li className="flex items-center justify-center">
                    <img src={magicWandIconPath} alt="Твори заклинания" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Твори заклинания
                  </li>
                </ul>
                <ul className="space-y-1.5 sm:space-y-2">
                  <li className="flex items-center justify-center">
                    <img src={defenceIconPath} alt="Отражай удары" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Отражай удары
                  </li>
                </ul>
              </div>
              <div className="text-sm text-muted-foreground mb-4 sm:mb-6 flex items-center justify-center">
                <img src={highScoreIconPath} alt="Завоевывай очки" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Завоевывай очки
              </div>
              <Button 
                className="w-full text-sm h-10 mt-auto" 
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
            className="spell-card border-border/20 cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20 flex flex-col h-full"
            data-testid="card-role-spectator"
          >
            <CardHeader>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-1 sm:mb-2 mx-auto">
                <img src={spectatorIconPath} alt="Наблюдатель" className="w-9 h-9 sm:w-10 sm:h-10 object-contain" />
              </div>
              <CardTitle className="text-center text-xl sm:text-2xl">Наблюдатель</CardTitle>
              {!isPhone && (
                <CardDescription className="text-center text-sm">
                  Следите за ходом битвы
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <div className="grid grid-cols-2 gap-x-6 mb-4 sm:mb-6 text-sm text-muted-foreground">
                <ul className="space-y-1.5 sm:space-y-2">
                  <li className="flex items-center justify-center">
                    <img src={binocularsIconPath} alt="Стань зрителем" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Стань зрителем
                  </li>
                </ul>
                <ul className="space-y-1.5 sm:space-y-2">
                  <li className="flex items-center justify-center">
                    <img src={scoreboardIconPath} alt="Следи за счетом" className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Следи за счетом
                  </li>
                </ul>
              </div>
              <Button 
                variant="secondary"
                className="w-full text-sm h-10 mt-auto" 
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
