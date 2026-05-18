'use client';

import { 
  Search, 
  Clock, 
  User as UserIcon 
} from 'lucide-react';
import Dock from './ui/Dock';

type Page = 'scanner' | 'history' | 'profile';

interface NavigationProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const items = [
    { 
      icon: <Search size={24} className={currentPage === 'scanner' ? 'text-primary' : 'text-muted-foreground'} />, 
      label: 'Scanner', 
      onClick: () => onPageChange('scanner') 
    },
    { 
      icon: <Clock size={24} className={currentPage === 'history' ? 'text-primary' : 'text-muted-foreground'} />, 
      label: 'History', 
      onClick: () => onPageChange('history') 
    },
    { 
      icon: <UserIcon size={24} className={currentPage === 'profile' ? 'text-primary' : 'text-muted-foreground'} />, 
      label: 'Profile', 
      onClick: () => onPageChange('profile') 
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-28 pointer-events-none z-50 flex items-end justify-center">
      <div className="pointer-events-auto relative w-full h-full flex items-end justify-center">
        <Dock 
          items={items}
          panelHeight={76}
          baseItemSize={56}
          magnification={80}
        />
      </div>
    </div>
  );
}
