import { Zap, Shield, Heart, TrendingUp } from 'lucide-react';

interface ManipulationSignalsProps {
  signals: string[];
}

const signalIcons: Record<string, React.ReactNode> = {
  'Urgency Pressure': <Zap className="w-4 h-4" />,
  'Authority Impersonation': <Shield className="w-4 h-4" />,
  'Emotional Manipulation': <Heart className="w-4 h-4" />,
  'Financial Request': <TrendingUp className="w-4 h-4" />,
};

export function ManipulationSignals({ signals }: ManipulationSignalsProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Detected Manipulation Signals</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {signals.map((signal) => (
          <div
            key={signal}
            className="flex items-center gap-3 p-3 rounded-lg bg-input border border-border/50 hover:border-primary/30 transition-all"
          >
            <div className="text-secondary">
              {signalIcons[signal] || <Zap className="w-4 h-4" />}
            </div>
            <span className="text-sm font-medium text-foreground">{signal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
