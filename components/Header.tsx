'use client';

import { Bell, Settings, Moon } from 'lucide-react';
import UnifiedWalletButton from './UnifiedWalletButton';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg sm:text-xl">K</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-gray-900">kira</span>
          <span className="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-md">Beta</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <UnifiedWalletButton />
          <button
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors hidden sm:block"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden md:block"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden md:block"
            aria-label="Toggle dark mode"
          >
            <Moon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  );
}
