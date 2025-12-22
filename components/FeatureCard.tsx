import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}

export default function FeatureCard({ icon, title, description, onClick }: FeatureCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer group text-left w-full"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl mt-1">{icon}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  );
}
