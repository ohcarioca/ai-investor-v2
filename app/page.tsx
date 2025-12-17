'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import FeatureCard from '@/components/FeatureCard';
import PortfolioOverview from '@/components/PortfolioOverview';
import ChatInput from '@/components/ChatInput';
import ChatHistory from '@/components/ChatHistory';
import { useChat } from '@/hooks/useChat';

const DEFAULT_SIDEBAR_WIDTH = 384;
const STORAGE_KEY = 'portfolio-sidebar-width';

export default function Home() {
  const { messages, isLoading, sendMessage, notifySwapSuccess } = useChat();
  const showWelcome = messages.length === 0;

  // Initialize sidebar width from localStorage
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    // Check initial screen size and calculate max width
    const checkScreenSize = () => {
      const screenWidth = window.innerWidth;
      setIsLargeScreen(screenWidth >= 1024);

      // Adjust sidebar width if it exceeds 50% of screen
      const maxWidth = Math.floor(screenWidth * 0.5);
      setSidebarWidth(prev => Math.min(prev, maxWidth));
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    // Load stored sidebar width
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      const maxWidth = Math.floor(window.innerWidth * 0.5);
      if (!isNaN(parsed) && parsed >= 280 && parsed <= maxWidth) {
        setSidebarWidth(parsed);
      }
    }

    // Listen for custom sidebar resize event (immediate sync)
    const handleSidebarResize = (e: CustomEvent<{ width: number }>) => {
      const newWidth = e.detail.width;
      const maxWidth = Math.floor(window.innerWidth * 0.5);
      if (newWidth >= 280 && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    window.addEventListener('sidebar-resize', handleSidebarResize as EventListener);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
      window.removeEventListener('sidebar-resize', handleSidebarResize as EventListener);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content - sidebar is hidden on screens smaller than lg */}
      <main
        className="pt-20 pb-24 sm:pb-32 flex flex-col min-h-screen"
        style={{ paddingRight: isLargeScreen ? sidebarWidth : 0 }}
      >
        {showWelcome ? (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Welcome Section */}
            <div className="text-center mb-12 sm:mb-16">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-3xl sm:text-4xl">K</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 px-4">
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Kira</span>
              </h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
                Your AI-powered financial assistant. I can help you invest, manage payouts, exchange currencies, and track your portfolio.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <FeatureCard
                icon="💰"
                title="Invest in Funds"
                description="Allocate your USDT/USDC to growth, stable, or high-yield funds"
              />

              <FeatureCard
                icon="📊"
                title="Reports & Receipts"
                description="Generate transaction receipts, APY charts, and balance reports"
              />
            </div>
          </div>
        ) : (
          <ChatHistory
            messages={messages}
            isLoading={isLoading}
            onSwapSuccess={notifySwapSuccess}
          />
        )}
      </main>

      {/* Portfolio Sidebar */}
      <PortfolioOverview />

      {/* Chat Input */}
      <ChatInput
        onSendMessage={sendMessage}
        isLoading={isLoading}
        sidebarWidth={sidebarWidth}
        isLargeScreen={isLargeScreen}
      />
    </div>
  );
}
