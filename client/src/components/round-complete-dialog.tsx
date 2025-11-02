import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import GesturePreview from "@/components/gesture-preview";
import type { GameSession, Point, Spell } from "@shared/schema";

export default function RoundCompleteDialog({
  open,
  onOpenChange,
  session,
  allSpells,
  onContinue
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: GameSession | undefined;
  allSpells: Spell[];
  onContinue?: () => void;
}) {
  const attackGesture = session?.lastCompletedAttackGesture as Point[] | undefined;
  const counterGesture = session?.lastCompletedCounterGesture as Point[] | undefined;
  const attackSpellName = session?.lastCompletedAttackSpellId
    ? allSpells.find(s => s.id === session.lastCompletedAttackSpellId)?.name
    : "Неизвестно";
  const counterSpellName = session?.lastCompletedCounterSpellId
    ? allSpells.find(s => s.id === session.lastCompletedCounterSpellId)?.name
    : "Не выполнено";
  // Align low accuracy threshold with success logic (57%)
  const isLowCounterAccuracy = (session?.lastCompletedCounterAccuracy || 0) < 57;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs" data-testid="dialog-round-complete">
        <DialogHeader>
          <DialogTitle className="font-decorative text-lg decorative-text">
            {session?.isBonusRound ? "БОНУСНЫЙ РАУНД ЗАВЕРШЕН" : "Раунд завершен"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {session?.isBonusRound ? "Результаты бонусного раунда" : "Результаты раунда"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <div className="bg-primary/10 rounded-lg p-2 border border-primary/20">
            <p className="text-xs text-muted-foreground mb-1">Атакующий</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-foreground text-sm">
                  {attackSpellName}
                </p>
                <p className="text-xs text-primary">
                  Точность: {session?.lastCompletedAttackAccuracy || 0}%
                </p>
                {typeof session?.lastCompletedAttackTimeSpent === 'number' ? (
                  <p className="text-xs text-muted-foreground">
                    Время: {session?.lastCompletedAttackTimeSpent} сек
                  </p>
                ) : null}
              </div>
              {attackGesture && attackGesture.length > 0 ? (
                <div className="flex items-center justify-center">
                  <GesturePreview gesture={attackGesture} className="flex-shrink-0 w-12 h-12" />
                </div>
              ) : null}
            </div>
          </div>
          
          <div className={`rounded-lg p-2 border ${
            isLowCounterAccuracy
              ? 'bg-muted/10 border-border/20'
              : (session?.lastCompletedCounterSuccess
                  ? 'bg-green-500/10 border-green-500/20'
                  : 'bg-red-500/10 border-red-500/20')
          }`}>
            <p className="text-xs text-muted-foreground mb-1">Защищающийся</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-foreground text-sm">
                  {counterSpellName}
                </p>
                <p className={`text-xs ${isLowCounterAccuracy ? 'text-muted-foreground' : (session?.lastCompletedCounterSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}`}>
                  Точность: {session?.lastCompletedCounterAccuracy || 0}%
                </p>
                {typeof session?.lastCompletedCounterTimeSpent === 'number' ? (
                  <p className="text-xs text-muted-foreground">
                    Время: {session?.lastCompletedCounterTimeSpent} сек
                  </p>
                ) : null}
              </div>
              {counterGesture && counterGesture.length > 0 ? (
                <div className="flex items-center justify-center">
                  <GesturePreview gesture={counterGesture} className="flex-shrink-0 w-12 h-12" />
                </div>
              ) : null}
            </div>
          </div>

          {session?.bonusRoundWinner ? (
            <div className="rounded-lg p-2 border bg-yellow-500/10 border-yellow-500/20">
              <p className="text-xs text-muted-foreground mb-1">Бонусный победитель</p>
              <p className="text-sm font-semibold">
                Победитель бонусного раунда: Игрок {session?.bonusRoundWinner}
              </p>
            </div>
          ) : null}
        </div>
        {onContinue ? (
          <Button
            onClick={onContinue}
            className="w-full glow-primary text-sm py-2"
            data-testid="button-continue-next-round"
          >
            Следующий раунд
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}