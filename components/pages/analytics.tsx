'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export function Analytics() {
  const chartData = [
    { name: 'Mon', analyzed: 12, high: 8, medium: 3, low: 1 },
    { name: 'Tue', analyzed: 19, high: 12, medium: 5, low: 2 },
    { name: 'Wed', analyzed: 15, high: 9, medium: 4, low: 2 },
    { name: 'Thu', analyzed: 25, high: 18, medium: 5, low: 2 },
    { name: 'Fri', analyzed: 22, high: 15, medium: 5, low: 2 },
    { name: 'Sat', analyzed: 18, high: 11, medium: 5, low: 2 },
    { name: 'Sun', analyzed: 14, high: 8, medium: 4, low: 2 },
  ];

  const stats = [
    {
      label: 'Total Analyzed',
      value: '125',
      icon: '📊',
      color: 'from-primary to-secondary',
    },
    {
      label: 'High Risk',
      value: '81',
      icon: '⚠️',
      color: 'from-danger to-warning',
    },
    {
      label: 'Medium Risk',
      value: '31',
      icon: '⚡',
      color: 'from-warning to-secondary',
    },
    {
      label: 'Low Risk',
      value: '13',
      icon: '✅',
      color: 'from-success to-primary',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        {/* Title Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Overview of message analysis statistics and trends</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg p-6 hover:border-primary/30 transition-all"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Chart Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Weekly Analysis Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis 
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                axisLine={{ stroke: '#334155' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#F1F5F9'
                }}
              />
              <Bar dataKey="analyzed" fill="#3B82F6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* High Risk Messages */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Risk Distribution</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-foreground">High Risk</span>
                  <span className="font-semibold text-danger">65%</span>
                </div>
                <div className="w-full h-3 bg-input rounded-full overflow-hidden border border-border/50">
                  <div className="h-full bg-danger" style={{ width: '65%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-foreground">Medium Risk</span>
                  <span className="font-semibold text-warning">25%</span>
                </div>
                <div className="w-full h-3 bg-input rounded-full overflow-hidden border border-border/50">
                  <div className="h-full bg-warning" style={{ width: '25%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-foreground">Low Risk</span>
                  <span className="font-semibold text-success">10%</span>
                </div>
                <div className="w-full h-3 bg-input rounded-full overflow-hidden border border-border/50">
                  <div className="h-full bg-success" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Top Threats */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Most Common Threats</h3>
            <div className="space-y-3">
              {['Urgency Pressure', 'Authority Impersonation', 'Financial Request', 'Emotional Manipulation'].map((threat, index) => (
                <div key={threat} className="flex items-center justify-between p-3 rounded-lg bg-input border border-border/50">
                  <span className="text-foreground text-sm">{threat}</span>
                  <span className="font-semibold text-primary">{85 - index * 10}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
