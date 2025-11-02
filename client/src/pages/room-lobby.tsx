import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wand2, Copy, Check } from "lucide-react";
import duelIconPath from "@assets/image_1760081444104.png";
import gryffindorIcon from "@assets/icons8-hogwarts-legacy-gryffindor-480_1760083007155.png";
import ravenclawIcon from "@assets/icons8-hogwarts-legacy-ravenclaw-480_1760083011315.png";
import slytherinIcon from "@assets/icons8-hogwarts-legacy-slytherin-480_1760083015546.png";
import hufflepuffIcon from "@assets/icons8-hogwarts-legacy-hufflepuff-480_1760083019603.png";
import { GAME_VERSION } from "@shared/config";

const houses = [
  { id: "gryffindor", name: "Гриффиндор", icon: gryffindorIcon, color: "#EF4444", shadowColor: "239, 68, 68" },
  { id: "ravenclaw", name: "Когтевран", icon: ravenclawIcon, color: "#3B82F6", shadowColor: "59, 130, 246" },
  { id: "slytherin", name: "Слизерин", icon: slytherinIcon, color: "#10B981", shadowColor: "16, 185, 129" },
  { id: "hufflepuff", name: "Пуффендуй", icon: hufflepuffIcon, color: "#EAB308", shadowColor: "234, 179, 8" },
] as const;

export default function RoomLobby() {
  const [, setLocation] = useLocation();
  const [createUserName, setCreateUserName] = useState("");
  const [createHouse, setCreateHouse] = useState<string>("");
  const [joinUserName, setJoinUserName] = useState("");
  const [joinHouse, setJoinHouse] = useState<string>("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const createRoomMutation = useMutation({
    mutationFn: async () => {
      if (!createUserName.trim()) {
        throw new Error("Введите ваше имя");
      }
      if (!createHouse) {
        throw new Error("Выберите факультет");
      }
      const res = await apiRequest("POST", "/api/rooms", { hostName: createUserName });
      return res.json();
    },
    onSuccess: (data) => {
      const { room } = data;
      localStorage.setItem("userName", createUserName);
      localStorage.setItem("userHouse", createHouse);
      setCreatedRoomId(room.id);
      setShowRoomDialog(true);
    },
    onError: (error: Error) => {
      // Убраны всплывающие оповещения: не показываем тост
      console.warn(error.message);
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: async () => {
      if (!joinUserName.trim()) {
        throw new Error("Введите ваше имя");
      }
      if (!joinHouse) {
        throw new Error("Выберите факультет");
      }
      if (!joinRoomId.trim()) {
        throw new Error("Введите ID комнаты");
      }
      
      // Check if room exists
      const res = await fetch(`/api/rooms/${joinRoomId}`);
      if (!res.ok) {
        throw new Error("Комната не найдена");
      }
      return { roomId: joinRoomId };
    },
    onSuccess: (data) => {
      localStorage.setItem("userName", joinUserName);
      localStorage.setItem("userHouse", joinHouse);
      setLocation(`/rooms/${data.roomId}/role-selection`);
    },
    onError: (error: Error) => {
      // Убраны всплывающие оповещения: не показываем тост
      console.warn(error.message);
    },
  });

  const handleCreateRoom = () => {
    createRoomMutation.mutate();
  };

  const handleJoinRoom = () => {
    joinRoomMutation.mutate();
  };

  const handleCopyRoomId = async () => {
    await navigator.clipboard.writeText(createdRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Убраны всплывающие оповещения: не показываем тост
  };

  const handleEnterRoom = () => {
    setShowRoomDialog(false);
    setLocation(`/rooms/${createdRoomId}/role-selection`);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <span className="absolute top-0 left-0 text-xs md:text-sm text-muted-foreground">Версия {`v${GAME_VERSION}`}</span>
        <Card className="spell-card border-border/20 w-full max-w-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img src={duelIconPath} alt="Дуэльная арена" className="w-24 h-24 object-contain" />
              </div>
              <h1 className="text-4xl md:text-5xl font-angst mb-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                Добро пожаловать!
              </h1>
              <p className="text-lg text-muted-foreground font-serif">
                Создайте комнату или присоединитесь к существующей
              </p>
            </div>

            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create" data-testid="tab-create">Создать комнату</TabsTrigger>
                <TabsTrigger value="join" data-testid="tab-join">Присоединиться</TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-6">
                <div>
                  <Label htmlFor="createUserName" className="text-base font-medium">
                    Ваше имя
                  </Label>
                  <Input
                    id="createUserName"
                    type="text"
                    placeholder="Введите ваше имя..."
                    value={createUserName}
                    onChange={(e) => setCreateUserName(e.target.value)}
                    className="mt-2 h-12 text-base"
                    data-testid="input-create-user-name"
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">
                    Ваш факультет
                  </Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {houses.map((house) => (
                      <button
                        key={house.id}
                        type="button"
                        onClick={() => setCreateHouse(house.id)}
                        className="p-3 rounded-lg border-2 transition-all hover:scale-105"
                        style={{
                          borderColor: createHouse === house.id ? house.color : "rgba(255, 255, 255, 0.1)",
                          backgroundColor: createHouse === house.id ? `${house.color}15` : "transparent",
                          boxShadow: createHouse === house.id ? `0 10px 15px -3px rgba(${house.shadowColor}, 0.5)` : "none"
                        }}
                        data-testid={`button-house-${house.id}-create`}
                      >
                        <img
                          src={house.icon}
                          alt={house.name}
                          className="w-16 h-16 mx-auto mb-2"
                        />
                        <p className="text-sm font-medium text-center">{house.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCreateRoom}
                  disabled={createRoomMutation.isPending}
                  className="w-full h-14 text-lg"
                  data-testid="button-create-room"
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  Создать комнату
                </Button>
              </TabsContent>

              <TabsContent value="join" className="space-y-6">
                <div>
                  <Label htmlFor="joinUserName" className="text-base font-medium">
                    Ваше имя
                  </Label>
                  <Input
                    id="joinUserName"
                    type="text"
                    placeholder="Введите ваше имя..."
                    value={joinUserName}
                    onChange={(e) => setJoinUserName(e.target.value)}
                    className="mt-2 h-12 text-base"
                    data-testid="input-join-user-name"
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">
                    Ваш факультет
                  </Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {houses.map((house) => (
                      <button
                        key={house.id}
                        type="button"
                        onClick={() => setJoinHouse(house.id)}
                        className="p-3 rounded-lg border-2 transition-all hover:scale-105"
                        style={{
                          borderColor: joinHouse === house.id ? house.color : "rgba(255, 255, 255, 0.1)",
                          backgroundColor: joinHouse === house.id ? `${house.color}15` : "transparent",
                          boxShadow: joinHouse === house.id ? `0 10px 15px -3px rgba(${house.shadowColor}, 0.5)` : "none"
                        }}
                        data-testid={`button-house-${house.id}-join`}
                      >
                        <img
                          src={house.icon}
                          alt={house.name}
                          className="w-16 h-16 mx-auto mb-2"
                        />
                        <p className="text-sm font-medium text-center">{house.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="joinRoomId" className="text-base font-medium">
                    ID комнаты
                  </Label>
                  <Input
                    id="joinRoomId"
                    type="text"
                    placeholder="Вставьте ID комнаты..."
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    className="mt-2 h-12 text-base"
                    data-testid="input-join-room-id"
                  />
                </div>

                <Button
                  onClick={handleJoinRoom}
                  disabled={joinRoomMutation.isPending}
                  className="w-full h-14 text-lg"
                  data-testid="button-join-room"
                >
                  Присоединиться к комнате
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Комната создана!</DialogTitle>
            <DialogDescription>
              Скопируйте ID комнаты и отправьте друзьям
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="roomIdCopy" className="text-sm font-medium">
                  ID комнаты
                </Label>
                <Input
                  id="roomIdCopy"
                  value={createdRoomId}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-created-room-id"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyRoomId}
                className="mt-6"
                data-testid="button-copy-room-id"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={handleEnterRoom}
              className="w-full"
              data-testid="button-enter-room"
            >
              Войти в комнату
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
