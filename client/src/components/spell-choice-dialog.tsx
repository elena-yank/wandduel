import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Spell } from "@shared/schema";

export type SpellChoice = { spell: Spell; accuracy: number };

export default function SpellChoiceDialog({
  open,
  onOpenChange,
  choices,
  onSelect
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  choices: SpellChoice[] | undefined;
  onSelect: (choice: SpellChoice) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" data-testid="dialog-spell-choice">
        <DialogHeader>
          <DialogTitle className="font-decorative text-xl decorative-text">
            Выберите заклинание
          </DialogTitle>
          <DialogDescription className="text-sm">
            Несколько заклинаний соответствуют вашему движению. Выберите нужное:
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-3">
          {choices?.map((choice, index) => (
            <Button
              key={choice.spell.id}
              onClick={() => onSelect(choice)}
              variant="outline"
              className="h-auto flex flex-col items-start p-3 text-left hover:bg-primary/10 transition-colors"
              data-testid={`button-spell-choice-${index}`}
            >
              <div className="flex items-center gap-2 w-full">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: choice.spell.color }}
                />
                <div className="flex-1">
                  <p className="font-serif font-semibold text-sm text-foreground">
                    {choice.spell.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {choice.spell.colorName} • {choice.accuracy.toFixed(0)}% точность
                  </p>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}