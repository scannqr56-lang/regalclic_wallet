import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { fetchBusinessAiUsageMonth, formatBusinessAiActivityLine } from '@/lib/ai-usage';

export default function AiActivitySummary({ businessId, className = '' }) {
  const activityQuery = useQuery({
    queryKey: ['ai-usage-month', businessId],
    queryFn: () => fetchBusinessAiUsageMonth(businessId),
    enabled: !!businessId,
    staleTime: 120_000,
  });

  const line = formatBusinessAiActivityLine(activityQuery.data);
  if (!line) return null;

  return (
    <p className={`flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
      <Activity className="h-3.5 w-3.5" />
      <span>{line}</span>
    </p>
  );
}
