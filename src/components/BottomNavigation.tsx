import React from 'react';
import { motion } from 'motion/react';
import { Gauge, BarChart3, User } from 'lucide-react';
import { AppTab, AppSettings } from '../types';
import { triggerVibrate } from '../services/soundService';

interface BottomNavigationProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  settings: AppSettings;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
  settings
}) => {
  const tabs = [
    {
      id: 'dashboard' as AppTab,
      label: 'Dashboard',
      icon: Gauge
    },
    {
      id: 'stats' as AppTab,
      label: 'Stats',
      icon: BarChart3
    },
    {
      id: 'profile' as AppTab,
      label: 'Profile',
      icon: User
    }
  ];

  const handleSelect = (tab: AppTab) => {
    if (tab !== currentTab) {
      triggerVibrate(settings.vibration, 20);
      onTabChange(tab);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none flex justify-center">
      <nav
        aria-label="App Navigation"
        className="pointer-events-auto w-full max-w-sm rounded-[28px] glass-panel bg-[#0B0D14]/90 border border-white/10 shadow-2xl backdrop-blur-2xl p-1.5 flex items-center justify-between"
      >
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelect(tab.id)}
              className={`relative flex-1 py-2.5 px-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer ${
                isActive ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {/* Active Background Pill Animation */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavPill"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-600/30 to-red-500/20 border border-red-500/35 shadow-inner"
                />
              )}

              <div className="relative z-10 flex flex-col items-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'text-red-400 scale-105' : 'text-neutral-400'
                  }`}
                />
                <span
                  className={`text-[11px] font-bold tracking-tight mt-0.5 ${
                    isActive ? 'text-white' : 'text-neutral-400'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
