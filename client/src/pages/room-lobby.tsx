import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, apiUrl } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wand2, Copy, Check } from "lucide-react";
import duelIconPath from "@assets/image_1760081444104.png";
import bannerPath from "@assets/banner.jpg";
import banner2Path from "@assets/banner-2.jpg";
import gryffindorIcon from "@assets/icons8-hogwarts-legacy-gryffindor-480_1760083007155.png";
import ravenclawIcon from "@assets/icons8-hogwarts-legacy-ravenclaw-480_1760083011315.png";
import slytherinIcon from "@assets/icons8-hogwarts-legacy-slytherin-480_1760083015546.png";
import hufflepuffIcon from "@assets/icons8-hogwarts-legacy-hufflepuff-480_1760083019603.png";
import { GAME_VERSION } from "@shared/config";
import { useIsPhone } from "@/hooks/use-phone";

const houses = [
  { id: "gryffindor", name: "Гриффиндор", icon: gryffindorIcon, color: "#EF4444", shadowColor: "239, 68, 68" },
  { id: "ravenclaw", name: "Когтевран", icon: ravenclawIcon, color: "#3B82F6", shadowColor: "59, 130, 246" },
  { id: "slytherin", name: "Слизерин", icon: slytherinIcon, color: "#10B981", shadowColor: "16, 185, 129" },
  { id: "hufflepuff", name: "Пуффендуй", icon: hufflepuffIcon, color: "#EAB308", shadowColor: "234, 179, 8" },
] as const;

export default function RoomLobby() {
  const [, setLocation] = useLocation();
  const isPhone = useIsPhone();
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
      const res = await fetch(apiUrl(`/api/rooms/${joinRoomId}`));
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

  const [activeTab, setActiveTab] = useState<"create" | "join">("create");

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

  // Создание комнаты для тренировки и мгновенный вход на страницу тренировки
  const handleStartTraining = async () => {
    try {
      let userName = activeTab === "create" ? createUserName : joinUserName;
      let userHouse = activeTab === "create" ? createHouse : joinHouse;

      // Подставляем разумные значения по умолчанию, чтобы кнопка всегда работала
      if (!userName || !userName.trim()) {
        userName = localStorage.getItem("userName") || "Player";
      }
      if (!userHouse) {
        userHouse = (localStorage.getItem("userHouse") as any) || "gryffindor";
      }

      // API создания комнаты ожидает поле hostName
      const res = await apiRequest("POST", "/api/rooms", {
        hostName: userName,
      });
      if (!res.ok) throw new Error("Не удалось создать комнату для тренировки");
      const data = await res.json();
      const newRoomId = data.room.id;

      // Сохраняем имя/факультет
      localStorage.setItem("userName", userName);
      localStorage.setItem("userHouse", userHouse);

      // Переходим сразу в режим тренировки
      setLocation(`/rooms/${newRoomId}/training`);
    } catch (e) {
      console.warn("Training start error:", (e as Error).message);
    }
  };

  const handleEnterRoom = () => {
    setShowRoomDialog(false);
    setLocation(`/rooms/${createdRoomId}/role-selection`);
  };

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center pt-1 px-4 pb-0 md:pt-4 md:px-4 md:pb-1 relative">
        <div className="w-full max-w-3xl flex flex-col items-center">
          {isPhone && (
            <div className="w-full flex justify-end mb-1">
              <div className="flex gap-0">
                <a 
                  href="https://vk.ru/drake.fletcher" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="relative pl-6 pr-2 py-1 text-[9px] font-sans bg-gradient-to-r from-gray-800 to-gray-700 text-gray-200 hover:text-amber-400 transition-colors flex items-center justify-center min-w-[140px]"
                  style={{ 
                    clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)',
                    filter: 'drop-shadow(1px 0px 0px #4b5563) drop-shadow(-1px 0px 0px #4b5563) drop-shadow(0px 1px 0px #4b5563) drop-shadow(0px -1px 0px #4b5563)'
                  }}
                >
                  Тех. поддержка: Дрейк Флетчер
                </a>
                <a 
                  href="https://vk.ru/crouch_jr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="relative pl-6 pr-2 py-1 text-[9px] font-sans bg-gradient-to-r from-gray-800 to-gray-700 text-gray-200 hover:text-amber-400 transition-colors ml-[-1px] flex items-center justify-center min-w-[140px]"
                  style={{ 
                    clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)',
                    filter: 'drop-shadow(1px 0px 0px #4b5563) drop-shadow(-1px 0px 0px #4b5563) drop-shadow(0px 1px 0px #4b5563) drop-shadow(0px -1px 0px #4b5563)'
                  }}
                >
                  Арбитр: Барти Крауч-мл.
                </a>
              </div>
            </div>
          )}
          <Card className="spell-card border-border/20 w-full relative mb-0.5">
            {!isPhone && (
              <div className="flex gap-0 absolute -top-[30px] right-4 lg:right-8 z-20">
                <a 
                  href="https://vk.ru/drake.fletcher" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="relative pl-8 pr-2 lg:pl-12 lg:pr-4 py-1.5 lg:py-2 text-[8px] lg:text-[10px] xl:text-xs font-sans bg-gradient-to-r from-gray-800 to-gray-700 text-gray-200 hover:text-amber-400 transition-colors flex items-center justify-center min-w-[140px] lg:min-w-[180px]"
                  style={{ 
                    clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)',
                    filter: 'drop-shadow(1px 0px 0px #4b5563) drop-shadow(-1px 0px 0px #4b5563) drop-shadow(0px 1px 0px #4b5563) drop-shadow(0px -1px 0px #4b5563)'
                  }}
                >
                  Тех. поддержка: Дрейк Флетчер
                </a>
                <a 
                  href="https://vk.ru/crouch_jr" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="relative pl-8 pr-2 lg:pl-12 lg:pr-4 py-1.5 lg:py-2 text-[8px] lg:text-[10px] xl:text-xs font-sans bg-gradient-to-r from-gray-800 to-gray-700 text-gray-200 hover:text-amber-400 transition-colors ml-[-1px] flex items-center justify-center min-w-[140px] lg:min-w-[180px]"
                  style={{ 
                    clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)',
                    filter: 'drop-shadow(1px 0px 0px #4b5563) drop-shadow(-1px 0px 0px #4b5563) drop-shadow(0px 1px 0px #4b5563) drop-shadow(0px -1px 0px #4b5563)'
                  }}
                >
                  Арбитр: Барти Крауч-мл.
                </a>
              </div>
            )}
            {!isPhone && (
              <span className="absolute top-2 left-2 text-xs md:text-sm text-muted-foreground">
                Версия {`v${GAME_VERSION}`}
              </span>
            )}
            <CardContent className="p-2 md:p-10">
              {isPhone ? (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "join")} className="w-full">
                <div className="grid grid-cols-2 gap-3 items-stretch">
                  <div className="col-span-1 flex flex-col h-full">
                    <div className="flex-1 min-h-0">
                      <a
                        href="https://vk.ru/magichogwarts_school"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative flex items-center justify-center w-full h-full overflow-hidden rounded-lg"
                      >
                        <span className="absolute top-2 left-2 z-10 text-[11px] font-semibold text-amber-300 bg-black/45 px-2 py-0.5 rounded-sm drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
                          Версия {`v${GAME_VERSION}`}
                        </span>
                        <img
                          src={bannerPath}
                          alt="Мир Гарри Поттера"
                          className="w-full h-full object-contain object-bottom hover:opacity-90 transition-opacity"
                        />
                      </a>
                    </div>

                    <div className="h-[84px] flex flex-col justify-end shrink-0">
                      <TabsContent value="create" className="mt-0">
                        <Input
                          id="createUserName"
                          type="text"
                          placeholder="Ваше имя..."
                          value={createUserName}
                          onChange={(e) => setCreateUserName(e.target.value)}
                          className="h-9 text-sm"
                          data-testid="input-create-user-name"
                        />
                      </TabsContent>

                      <TabsContent value="join" className="mt-0 space-y-1.5">
                        <Input
                          id="joinUserName"
                          type="text"
                          placeholder="Ваше имя..."
                          value={joinUserName}
                          onChange={(e) => setJoinUserName(e.target.value)}
                          className="h-9 text-sm"
                          data-testid="input-join-user-name"
                        />
                        <Input
                          id="joinRoomId"
                          type="text"
                          placeholder="Вставьте ID комнаты..."
                          value={joinRoomId}
                          onChange={(e) => setJoinRoomId(e.target.value)}
                          className="h-9 text-sm"
                          data-testid="input-join-room-id"
                        />
                      </TabsContent>
                    </div>
                  </div>

                  <div className="col-span-1 grid grid-rows-[auto,1fr,auto] gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <TabsList className="grid w-full grid-cols-2 h-8 bg-[#334155] p-0.5 rounded-sm border border-white/5">
                        <TabsTrigger 
                          className="w-full text-[11px] font-medium py-1 px-2 transition-all data-[state=active]:bg-[#0f172a] data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-300 rounded-sm" 
                          value="create" 
                          data-testid="tab-create" 
                        >
                          Создать комнату
                        </TabsTrigger>
                        <TabsTrigger 
                          className="w-full text-[11px] font-medium py-1 px-2 transition-all data-[state=active]:bg-[#0f172a] data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-300 rounded-sm" 
                          value="join" 
                          data-testid="tab-join" 
                        >
                          Присоединиться
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="h-full min-h-0 grid grid-rows-[auto,auto,1fr] gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-medium text-white tracking-tight">
                          Ваш факультет
                        </Label>
                        <Button 
                          className="h-7 px-3 text-[11px] bg-[#f97316] hover:bg-orange-600 text-[#0f172a] font-bold rounded-md shadow-sm" 
                          onClick={handleStartTraining} 
                          data-testid="button-start-training-mobile"
                        >
                          Тренировка
                        </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {houses.map((house) => {
                          const selectedHouse = activeTab === "create" ? createHouse : joinHouse;
                          const isSelected = selectedHouse === house.id;
                          return (
                            <button
                              key={house.id}
                              type="button"
                              onClick={() => (activeTab === "create" ? setCreateHouse(house.id) : setJoinHouse(house.id))}
                              className="p-1 rounded-lg border-2 transition-all hover:scale-105 h-full flex items-center justify-center min-h-[52px]"
                              style={{
                                borderColor: isSelected ? house.color : "rgba(255, 255, 255, 0.1)",
                                backgroundColor: isSelected ? `${house.color}15` : "transparent",
                                boxShadow: isSelected ? `0 10px 15px -3px rgba(${house.shadowColor}, 0.5)` : "none"
                              }}
                              data-testid={`button-house-${house.id}-${activeTab}`}
                            >
                              <img
                                src={house.icon}
                                alt={house.name}
                                className="w-full h-full max-w-[40px] max-h-[40px] mx-auto object-contain"
                              />
                            </button>
                          );
                        })}
                      </div>

                      <div className="min-h-0 flex items-center justify-center">
                        <div className="flex items-center justify-center gap-4">
                          <img src={duelIconPath} alt="Дуэльная арена" className="w-10 h-10 object-contain" />
                          <span className="font-angst text-[24px] leading-[0.95] text-center bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(234,179,8,0.55)]">
                            Добро пожаловать
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto h-[84px] flex flex-col justify-end shrink-0">
                      <Button
                        onClick={handleCreateRoom}
                        disabled={createRoomMutation.isPending}
                        className={`w-full h-9 text-sm font-bold shadow-md bg-violet-600 hover:bg-violet-700 ${activeTab === "create" ? "" : "hidden"}`}
                        data-testid="button-create-room"
                      >
                        <Wand2 className="w-4 h-4 mr-2" />
                        Создать комнату
                      </Button>

                      <Button
                        onClick={handleJoinRoom}
                        disabled={joinRoomMutation.isPending}
                        className={`w-full h-9 text-sm font-bold shadow-md bg-violet-600 hover:bg-violet-700 ${activeTab === "join" ? "" : "hidden"}`}
                        data-testid="button-join-room"
                      >
                        Присоединиться к комнате
                      </Button>
                    </div>
                  </div>
                </div>
              </Tabs>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Верхняя часть: две колонки */}
                <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="flex justify-center mb-4">
                      <img src={duelIconPath} alt="Дуэльная арена" className="w-20 h-20 object-contain" />
                    </div>
                    <h1 className="text-2xl lg:text-3xl font-angst mb-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                      Добро пожаловать!
                    </h1>
                    <p className="text-sm text-muted-foreground font-serif">
                      Создайте комнату или<br />присоединитесь к существующей
                    </p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <a
                      href="https://vk.ru/magichogwarts_school"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={bannerPath}
                        alt="Баннер"
                        className="w-full h-auto object-contain rounded-lg hover:opacity-90 transition-opacity"
                      />
                    </a>
                  </div>
                </div>

                {/* Нижняя часть: вкладки на всю ширину */}
                <Tabs defaultValue="create" className="w-full">
                  <div className="flex items-center justify-between mb-6">
                    <TabsList className="grid w-full max-w-[520px] grid-cols-2">
                      <TabsTrigger value="create" data-testid="tab-create" onClick={() => setActiveTab("create")}>Создать комнату</TabsTrigger>
                      <TabsTrigger value="join" data-testid="tab-join" onClick={() => setActiveTab("join")}>Присоединиться</TabsTrigger>
                    </TabsList>
                    <Button variant="secondary" onClick={handleStartTraining} data-testid="button-start-training-desktop">
                      Тренировка
                    </Button>
                  </div>

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
                        className="mt-2 h-10 text-base"
                        data-testid="input-create-user-name"
                      />
                    </div>

                    <div>
                      <Label className="text-base font-medium">
                        Ваш факультет
                      </Label>
                      <div className="flex justify-center gap-2 mt-2">
                        {houses.map((house) => (
                          <button
                            key={house.id}
                            type="button"
                            onClick={() => setCreateHouse(house.id)}
                            className="p-2 rounded-lg border-2 transition-all hover:scale-105"
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
                              className="w-12 h-12 mx-auto"
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateRoom}
                      disabled={createRoomMutation.isPending}
                      className="w-full h-12 text-base"
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
                      <div className="flex justify-center gap-2 mt-2">
                        {houses.map((house) => (
                          <button
                            key={house.id}
                            type="button"
                            onClick={() => setJoinHouse(house.id)}
                            className="p-2 rounded-lg border-2 transition-all hover:scale-105"
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
                              className="w-12 h-12 mx-auto"
                            />
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
                      className="w-full h-12 text-base"
                      data-testid="button-join-room"
                    >
                      Присоединиться к комнате
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            )}
           </CardContent>
          </Card>
          <div className="mt-0.5 mb-0.5 text-center text-[10px] md:text-xs text-amber-500 font-serif font-medium drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
            <span className="opacity-90 drop-shadow-[0_0_3px_rgba(245,158,11,0.4)]">© 2026</span> <a href="https://vk.ru/magichogwarts_school" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors underline underline-offset-4 drop-shadow-[0_0_3px_rgba(245,158,11,0.4)]">https://vk.ru/magichogwarts_school</a>
          </div>
        </div>
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
