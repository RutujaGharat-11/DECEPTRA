interface ManipulationMetersProps {
  urgencyLevel: number;
  authorityClaim: number;
  emotionalPressure: number;
  financialRequest: number;
}

interface MeterItemProps {
  label: string;
  value: number;
  color: string;
}

function MeterItem({ label, value, color }: MeterItemProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}%</span>
      </div>
      <div className="w-full h-2 bg-input rounded-full overflow-hidden border border-border/50">
        <div 
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function ManipulationMeters({
  urgencyLevel,
  authorityClaim,
  emotionalPressure,
  financialRequest,
}: ManipulationMetersProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Manipulation Analysis Meters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MeterItem label="Urgency Level" value={urgencyLevel} color="bg-warning" />
        <MeterItem label="Authority Claim" value={authorityClaim} color="bg-danger" />
        <MeterItem label="Emotional Pressure" value={emotionalPressure} color="bg-secondary" />
        <MeterItem label="Financial Request" value={financialRequest} color="bg-primary" />
      </div>
    </div>
  );
}
