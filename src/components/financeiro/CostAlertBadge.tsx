import { AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CostAlertBadgeProps {
  alerts: {
    alertName: string;
    message: string;
  }[];
  onClick?: () => void;
}

export function CostAlertBadge({ alerts, onClick }: CostAlertBadgeProps) {
  if (alerts.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className="inline-flex items-center justify-center p-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
          >
            <AlertTriangle className="h-4 w-4" />
            {alerts.length > 1 && (
              <span className="ml-0.5 text-xs font-medium">{alerts.length}</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[250px]">
          <div className="space-y-1">
            {alerts.map((alert, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{alert.alertName}:</span>{' '}
                <span className="text-muted-foreground">{alert.message}</span>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
