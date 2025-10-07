import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Wand2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RoomLobby() {
  const [, setLocation] = useLocation();
  const [userName, setUserName] = useState("");
  const [roomId, setRoomId] = useState("");
  const { toast } = useToast();

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!userName.trim()) {
        throw new Error("Введите ваше имя");
      }
      const res = await apiRequest("POST", "/api/rooms", { hostName: userName });
      return res.json();
    },
    onSuccess: (data) => {
      const { room } = data;
      localStorage.setItem("userName", userName);
      setLocation(`/rooms/${room.id}/role-selection`);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!userName.trim()) {
        throw new Error("Введите ваше имя");
      }
      if (!roomId.trim()) {
        throw new Error("Введите ID комнаты");
      }
      
      // Check if room exists
      const res = await fetch(`/api/rooms/${roomId}`);
      if (!res.ok) {
        throw new Error("Комната не найдена");
      }
      return { roomId };
    },
    onSuccess: (data) => {
      localStorage.setItem("userName", userName);
      setLocation(`/rooms/${data.roomId}/role-selection`);
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate();
  };

  const handleJoinRoom = () => {
    joinRoomMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="spell-card border-border/20 w-full max-w-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Wand2 className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-decorative decorative-text mb-3">
              Добро пожаловать!
            </h1>
            <p className="text-lg text-muted-foreground font-serif">
              Создайте комнату или присоединитесь к существующей
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="userName" className="text-base font-medium">
                Ваше имя
              </Label>
              <Input
                id="userName"
                type="text"
                placeholder="Введите ваше имя..."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-2 h-12 text-base"
                data-testid="input-user-name"
              />
            </div>

            <div>
              <Label htmlFor="roomId" className="text-base font-medium">
                ID комнаты
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="roomId"
                  type="text"
                  placeholder="Введите ID комнаты..."
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="h-12 text-base flex-1"
                  data-testid="input-room-id"
                />
                <Button
                  onClick={handleCreateRoom}
                  variant="outline"
                  className="h-12 px-6"
                  disabled={createRoomMutation.isPending}
                  data-testid="button-create-room"
                >
                  Создать
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <Button
                onClick={handleJoinRoom}
                disabled={joinRoomMutation.isPending}
                className="h-20 text-lg bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                data-testid="button-join-room"
              >
                <Users className="w-6 h-6 mr-2" />
                Стать игроком
              </Button>
              <Button
                onClick={handleJoinRoom}
                disabled={joinRoomMutation.isPending}
                variant="secondary"
                className="h-20 text-lg bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-700"
                data-testid="button-join-spectator"
              >
                <Users className="w-6 h-6 mr-2" />
                Стать зрителем
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
