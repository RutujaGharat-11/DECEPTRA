import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

interface RiskIndicatorProps {
  riskLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
}

export function RiskIndicator({ riskLevel, confidenceScore }: RiskIndicatorProps) {
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'low':
        return 'text-success';
      case 'medium':
        return 'text-warning';
      case 'high':
        return 'text-danger';
    }
  };

  const getRiskBgColor = () => {
    switch (riskLevel) {
      case 'low':
        return 'bg-success/10 border-success/20';
      case 'medium':
        return 'bg-warning/10 border-warning/20';
      case 'high':
        return 'bg-danger/10 border-danger/20';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="w-6 h-6" />;
      case 'medium':
        return <AlertTriangle className="w-6 h-6" />;
      case 'high':
        return <AlertCircle className="w-6 h-6" />;
    }
  };

  const getProgressColor = () => {
    switch (riskLevel) {
      case 'low':
        return 'bg-success';
      case 'medium':
        return 'bg-warning';
      case 'high':
        return 'bg-danger';
    }
  };

  const progressPercentage = riskLevel === 'low' ? 25 : riskLevel === 'medium' ? 50 : 100;

  return (
    <div className={`bg-card border border-border rounded-lg p-6 ${getRiskBgColor()}`}>
      <div className="flex items-center gap-4 mb-6">
        <div className={`${getRiskColor()}`}>
          {getRiskIcon()}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground capitalize">
            {riskLevel} Risk Level
          </h3>
          <p className="text-sm text-muted-foreground">Confidence Score: {confidenceScore.toFixed(1)}%</p>
        </div>
      </div>

      {/* Risk Meter Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Risk Level</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full h-2 bg-card rounded-full overflow-hidden border border-border/50">
          <div 
            className={`h-full ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
