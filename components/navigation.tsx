'use client';

import { 
  Search, 
  Clock, 
  BarChart3, 
  Settings as SettingsIcon 
} from 'lucide-react';

type Page = 'scanner' | 'history' | 'reports' | 'settings';

interface NavigationProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const navItems: Array<{ id: Page; label: string; icon: React.ReactNode }> = [
    { id: 'scanner', label: 'Scanner', icon: <Search className="w-5 h-5" /> },
    { id: 'history', label: 'History', icon: <Clock className="w-5 h-5" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  return (
    <nav className="border-t border-border bg-background fixed bottom-0 left-0 right-0">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
              currentPage === item.id
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
