import { Lightbulb } from 'lucide-react';

interface AIInterpretationProps {
  interpretation: string;
}

export function AIInterpretation({ interpretation }: AIInterpretationProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/10">
            <Lightbulb className="w-5 h-5 text-secondary" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-2">AI Analysis</h3>
          <p className="text-muted-foreground leading-relaxed">
            {interpretation}
          </p>
        </div>
      </div>
    </div>
  );
}
