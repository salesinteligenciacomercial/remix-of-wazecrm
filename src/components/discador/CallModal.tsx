import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, User } from 'lucide-react';
import { CallStatus } from '@/hooks/useCallCenter';

interface CallModalProps {
  open: boolean;
  onClose: () => void;
  leadName: string;
  phoneNumber: string;
  status: CallStatus;
  duration: number;
  isMuted: boolean;
  onEndCall: () => void;
  onToggleMute: () => void;
}

const statusLabels: Record<CallStatus, { label: string; color: string }> = {
  idle: { label: 'Aguardando', color: 'text-muted-foreground' },
  iniciando: { label: 'Iniciando...', color: 'text-yellow-500' },
  chamando: { label: 'Chamando...', color: 'text-yellow-500' },
  tocando: { label: 'Tocando...', color: 'text-blue-500' },
  conectado: { label: 'Conectado', color: 'text-green-500' },
  finalizado: { label: 'Finalizado', color: 'text-muted-foreground' },
  falha: { label: 'Falha na conexão', color: 'text-destructive' }
};

export const CallModal: React.FC<CallModalProps> = ({
  open,
  onClose,
  leadName,
  phoneNumber,
  status,
  duration,
  isMuted,
  onEndCall,
  onToggleMute
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const statusInfo = statusLabels[status];
  const isCallActive = ['iniciando', 'chamando', 'tocando', 'conectado'].includes(status);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">Ligação em Andamento</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-8 space-y-6">
          {/* Avatar/Icon */}
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-12 h-12 text-primary" />
          </div>

          {/* Lead Info */}
          <div className="text-center space-y-1">
            <h3 className="text-xl font-semibold">{leadName || 'Desconhecido'}</h3>
            <p className="text-muted-foreground">{phoneNumber}</p>
          </div>

          {/* Status */}
          <div className="text-center space-y-2">
            <div className={`text-lg font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </div>
            {status === 'conectado' && (
              <div className="text-2xl font-mono text-foreground">
                {formatDuration(duration)}
              </div>
            )}
          </div>

          {/* Pulse animation when ringing */}
          {['chamando', 'tocando'].includes(status) && (
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
              <Phone className="w-8 h-8 text-primary animate-pulse" />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4 pt-4">
            {/* Mute Button */}
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={onToggleMute}
              disabled={!isCallActive}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </Button>

            {/* End Call Button */}
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={onEndCall}
              disabled={status === 'finalizado'}
            >
              <PhoneOff className="w-8 h-8" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
