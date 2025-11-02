import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import RoomLobby from "@/pages/room-lobby";
import RoleSelection from "@/pages/role-selection";
import DuelArena from "@/pages/duel-arena";
import NotFound from "@/pages/not-found";
import OrientationLock from "@/components/orientation-lock";
import { Toaster } from "@/components/ui/toaster";

function Router() {
  return (
    <Switch>
      <Route path="/" component={RoomLobby} />
      <Route path="/rooms/:roomId/role-selection" component={RoleSelection} />
      <Route path="/rooms/:roomId/arena" component={DuelArena} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OrientationLock />
        <div className="magical-bg"></div>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
