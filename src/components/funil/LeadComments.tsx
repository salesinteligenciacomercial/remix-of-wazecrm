interface LeadCommentsProps {
  leadId: string;
  onCommentAdded?: () => void;
}

export function LeadComments({ leadId }: LeadCommentsProps) {
  return (
    <div className="text-sm text-muted-foreground p-4">
      Comentários: {leadId}
    </div>
  );
}
