import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CostConfiguration } from '@/hooks/useCompanyCosts';
import { Loader2, Save } from 'lucide-react';

interface CostConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CostConfiguration | null;
  onSave: (updates: Partial<CostConfiguration>) => Promise<boolean>;
}

export function CostConfigurationDialog({
  open,
  onOpenChange,
  config,
  onSave,
}: CostConfigurationDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    cost_per_lead: 5,
    cost_per_user: 500,
    cost_per_message_sent: 4,
    cost_per_message_received: 1,
    cost_per_media_file: 10,
    cost_per_gb_storage: 1000,
    cost_per_edge_call: 1,
    cost_per_ia_request: 50,
    cost_per_automation: 2,
    base_monthly_cost: 2000,
    whatsapp_utility_cost: 4,
    whatsapp_marketing_cost: 7,
    whatsapp_auth_cost: 5,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        cost_per_lead: config.cost_per_lead,
        cost_per_user: config.cost_per_user,
        cost_per_message_sent: config.cost_per_message_sent,
        cost_per_message_received: config.cost_per_message_received,
        cost_per_media_file: config.cost_per_media_file,
        cost_per_gb_storage: config.cost_per_gb_storage,
        cost_per_edge_call: config.cost_per_edge_call,
        cost_per_ia_request: config.cost_per_ia_request,
        cost_per_automation: config.cost_per_automation,
        base_monthly_cost: config.base_monthly_cost,
        whatsapp_utility_cost: config.whatsapp_utility_cost,
        whatsapp_marketing_cost: config.whatsapp_marketing_cost,
        whatsapp_auth_cost: config.whatsapp_auth_cost,
      });
    }
  }, [config]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData((prev) => ({ ...prev, [field]: Math.round(numValue * 100) / 100 }));
  };

  const formatCentsToReal = (cents: number): string => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const parseRealToCents = (value: string): number => {
    const cleaned = value.replace(',', '.');
    return Math.round(parseFloat(cleaned) * 100) || 0;
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const success = await onSave(formData);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Configurar Custos Unitários</DialogTitle>
          <DialogDescription>
            Defina os custos por unidade para calcular o custo operacional de cada subconta.
            Todos os valores são em centavos (R$).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Base Costs */}
            <div>
              <h4 className="font-medium mb-3">Custos Base</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="base_monthly_cost">Custo Fixo Mensal (centavos)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <Input
                      id="base_monthly_cost"
                      type="number"
                      value={formData.base_monthly_cost}
                      onChange={(e) => handleChange('base_monthly_cost', e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      = R$ {formatCentsToReal(formData.base_monthly_cost)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Usage Costs */}
            <div>
              <h4 className="font-medium mb-3">Custos por Uso</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cost_per_lead">Por Lead (centavos)</Label>
                  <Input
                    id="cost_per_lead"
                    type="number"
                    value={formData.cost_per_lead}
                    onChange={(e) => handleChange('cost_per_lead', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.cost_per_lead)} por lead
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_per_user">Por Usuário (centavos)</Label>
                  <Input
                    id="cost_per_user"
                    type="number"
                    value={formData.cost_per_user}
                    onChange={(e) => handleChange('cost_per_user', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.cost_per_user)} por usuário
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_per_message_sent">Msg Enviada (centavos)</Label>
                  <Input
                    id="cost_per_message_sent"
                    type="number"
                    value={formData.cost_per_message_sent}
                    onChange={(e) => handleChange('cost_per_message_sent', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.cost_per_message_sent)} por msg
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_per_message_received">Msg Recebida (centavos)</Label>
                  <Input
                    id="cost_per_message_received"
                    type="number"
                    value={formData.cost_per_message_received}
                    onChange={(e) => handleChange('cost_per_message_received', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.cost_per_message_received)} por msg
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_per_media_file">Arquivo de Mídia (centavos)</Label>
                  <Input
                    id="cost_per_media_file"
                    type="number"
                    value={formData.cost_per_media_file}
                    onChange={(e) => handleChange('cost_per_media_file', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.cost_per_media_file)} por arquivo
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_per_automation">Automação (centavos)</Label>
                  <Input
                    id="cost_per_automation"
                    type="number"
                    value={formData.cost_per_automation}
                    onChange={(e) => handleChange('cost_per_automation', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.cost_per_automation)} por execução
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_per_gb_storage">Storage por GB (centavos)</Label>
                  <Input
                    id="cost_per_gb_storage"
                    type="number"
                    value={formData.cost_per_gb_storage}
                    onChange={(e) => handleChange('cost_per_gb_storage', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.cost_per_gb_storage)} por GB
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost_per_ia_request">Request IA (centavos)</Label>
                  <Input
                    id="cost_per_ia_request"
                    type="number"
                    value={formData.cost_per_ia_request}
                    onChange={(e) => handleChange('cost_per_ia_request', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.cost_per_ia_request)} por request
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* WhatsApp Costs */}
            <div>
              <h4 className="font-medium mb-3">Custos WhatsApp (por tipo de mensagem)</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp_utility_cost">Utilidade (centavos)</Label>
                  <Input
                    id="whatsapp_utility_cost"
                    type="number"
                    value={formData.whatsapp_utility_cost}
                    onChange={(e) => handleChange('whatsapp_utility_cost', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.whatsapp_utility_cost)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp_marketing_cost">Marketing (centavos)</Label>
                  <Input
                    id="whatsapp_marketing_cost"
                    type="number"
                    value={formData.whatsapp_marketing_cost}
                    onChange={(e) => handleChange('whatsapp_marketing_cost', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.whatsapp_marketing_cost)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp_auth_cost">Autenticação (centavos)</Label>
                  <Input
                    id="whatsapp_auth_cost"
                    type="number"
                    value={formData.whatsapp_auth_cost}
                    onChange={(e) => handleChange('whatsapp_auth_cost', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    = R$ {formatCentsToReal(formData.whatsapp_auth_cost)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configuração
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
