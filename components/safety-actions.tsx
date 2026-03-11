import { AlertTriangle, CheckCircle, Link2 } from 'lucide-react';

export function SafetyActions() {
  const actions = [
    {
      icon: AlertTriangle,
      title: 'Do not send money',
      description: 'Never transfer funds in response to urgent requests',
    },
    {
      icon: CheckCircle,
      title: 'Verify sender identity',
      description: 'Contact the organization directly using official channels',
    },
    {
      icon: Link2,
      title: 'Avoid clicking suspicious links',
      description: 'Links may lead to phishing sites or malware',
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Recommended Safety Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <div key={action.title} className="p-4 rounded-lg bg-input border border-border/50 hover:border-primary/30 transition-all">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm mb-1">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
