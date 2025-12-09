'use client';

import Header from '@/components/Header';
import FeatureCard from '@/components/FeatureCard';
import PortfolioOverview from '@/components/PortfolioOverview';
import ChatInput from '@/components/ChatInput';
import ChatHistory from '@/components/ChatHistory';
import { useChat } from '@/hooks/useChat';

export default function Home() {
  const { messages, isLoading, sendMessage } = useChat();
  const showWelcome = messages.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="pt-20 pb-32 pr-96 flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
        {showWelcome ? (
          <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Welcome Section */}
            <div className="text-center mb-16">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-4xl">K</span>
                </div>
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Kira</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Your AI-powered financial assistant. I can help you invest, manage payouts, exchange currencies, and track your portfolio.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeatureCard
                icon="💰"
                title="Invest in Funds"
                description="Allocate your USDT/USDC to growth, stable, or high-yield funds"
              />

              <FeatureCard
                icon="🏦"
                title="Wire Transfers"
                description="Receive payins via wire with your dedicated bank account info"
              />

              <FeatureCard
                icon="💱"
                title="Currency Exchange"
                description="Convert USDC to COP, MXN, BRL and other currencies instantly"
              />

              <FeatureCard
                icon="📊"
                title="Reports & Receipts"
                description="Generate transaction receipts, APY charts, and balance reports"
              />
            </div>
          </div>
        ) : (
          <ChatHistory messages={messages} isLoading={isLoading} />
        )}
      </main>

      {/* Portfolio Sidebar */}
      <PortfolioOverview />

      {/* Chat Input */}
      <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
    </div>
  );
}
