import { Clock, Send, InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  type: 'scheduled' | 'sent';
}

export default function EmptyState({ type }: EmptyStateProps) {
  const config = {
    scheduled: {
      icon: Clock,
      title: 'No scheduled emails',
      description: "You don't have any emails queued up. Click Compose to schedule your first campaign.",
      color: 'text-blue-400',
      bg: 'bg-blue-50',
    },
    sent: {
      icon: Send,
      title: 'No sent emails yet',
      description: 'Sent emails will appear here once your scheduled campaigns are processed.',
      color: 'text-green-400',
      bg: 'bg-green-50',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      <div className={`w-16 h-16 ${config.bg} rounded-2xl flex items-center justify-center mb-4`}>
        <Icon className={`w-7 h-7 ${config.color}`} />
      </div>
      <h3 className="text-gray-900 font-semibold text-base mb-1">{config.title}</h3>
      <p className="text-gray-400 text-sm max-w-sm leading-relaxed">{config.description}</p>
    </div>
  );
}
