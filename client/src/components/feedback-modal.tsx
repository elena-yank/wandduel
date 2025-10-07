import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lightbulb, CheckCircle, XCircle } from "lucide-react";
import { type Spell } from "@shared/schema";

type RecognitionResult = {
  recognized: boolean;
  spell?: Spell;
  accuracy: number;
  isValidCounter?: boolean;
  successful: boolean;
  message?: string;
  wrongDefenseUsed?: boolean;
};

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: RecognitionResult | null;
  isCounterPhase: boolean;
}

export default function FeedbackModal({ 
  isOpen, 
  onClose, 
  result, 
  isCounterPhase,
  ...props 
}: FeedbackModalProps) {
  if (!result) return null;

  const getAccuracyRating = (accuracy: number) => {
    if (accuracy >= 90) return "Perfect";
    if (accuracy >= 80) return "Excellent";
    if (accuracy >= 70) return "Good";
    if (accuracy >= 60) return "Fair";
    return "Poor";
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case "Perfect": return "text-green-400";
      case "Excellent": return "text-green-500";
      case "Good": return "text-secondary";
      case "Fair": return "text-yellow-500";
      default: return "text-destructive";
    }
  };

  const rating = getAccuracyRating(result.accuracy);

  return (
    <Dialog open={isOpen} onOpenChange={onClose} {...props}>
      <DialogContent className="modal-overlay border-0 bg-transparent shadow-none">
        <div className="spell-card rounded-2xl p-8 max-w-lg w-full mx-4 glow-primary">
          <DialogHeader className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-10 h-10 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-serif font-bold text-foreground mb-2" data-testid="text-modal-title">
              {result.recognized ? "Spell Recognized!" : "Spell Not Recognized"}
            </DialogTitle>
          </DialogHeader>

          {result.recognized && result.spell && (
            <div className="space-y-4 mb-6">
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Spell Name</p>
                <p className="text-2xl font-serif font-bold text-primary" data-testid="text-recognized-spell">
                  {result.spell.name}
                </p>
              </div>
              
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Spell Color</p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full" 
                    style={{ backgroundColor: result.spell.color }}
                    data-testid="spell-color-indicator"
                  />
                  <span className="text-lg font-semibold text-foreground" data-testid="text-color-name">
                    {result.spell.colorName}
                  </span>
                </div>
              </div>
              
              <div className="bg-background/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Gesture Accuracy</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold text-foreground" data-testid="text-accuracy-percentage">
                    {result.accuracy}%
                  </span>
                  <span className={`px-3 py-1 rounded-full bg-secondary/20 text-sm font-semibold ${getRatingColor(rating)}`} data-testid="text-accuracy-rating">
                    {rating}
                  </span>
                </div>
                <div className="bg-background/50 rounded-full h-3 overflow-hidden">
                  <div 
                    className="accuracy-bar h-full transition-all duration-500" 
                    style={{ width: `${result.accuracy}%` }}
                    data-testid="modal-accuracy-bar"
                  />
                </div>
              </div>
              
              {isCounterPhase && (
                <div className="bg-background/50 rounded-lg p-4" data-testid="counter-validation">
                  <p className="text-sm text-muted-foreground mb-2">Counter Spell Status</p>
                  <div className="flex items-center gap-2">
                    {result.isValidCounter ? (
                      <>
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <span className="text-lg font-semibold text-green-500" data-testid="text-counter-status">
                          Correct Counter!
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-destructive" />
                        <span className="text-lg font-semibold text-destructive" data-testid="text-counter-status">
                          Wrong Counter
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!result.recognized && (
            <div className="mb-6">
              <div className="bg-background/50 rounded-lg p-4 text-center">
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                <p className="text-foreground font-semibold mb-2" data-testid="text-error-message">
                  {result.message || "Gesture not recognized"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Try drawing the gesture more clearly and precisely
                </p>
              </div>
            </div>
          )}
          
          <Button 
            className="w-full glow-primary" 
            onClick={onClose}
            data-testid="button-continue-duel"
          >
            Continue Duel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
