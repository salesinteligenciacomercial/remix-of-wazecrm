import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCostAlerts, CostAlert, CreateAlertInput } from '@/hooks/useCostAlerts';

interface CostAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAlert?: CostAlert | null;
}

export function CostAlertDialog({ open, onOpenChange, editingAlert }: CostAlertDialogProps) {
  const { createAlert, updateAlert } = useCostAlerts();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<{
    alert_name: string;
    alert_type: 'total_cost' | 'margin_percent' | 'cost_category';
    threshold_value: string;
    threshold_operator: '>' | '<' | '>=' | '<=';
    is_active: boolean;
    notify_email: boolean;
    notify_in_app: boolean;
  }>({
    alert_name: '',
    alert_type: 'total_cost',
    threshold_value: '',
    threshold_operator: '>',
    is_active: true,
    notify_email: true,
    notify_in_app: true,
  });

  useEffect(() => {
    if (editingAlert) {
      setFormData({
        alert_name: editingAlert.alert_name,
        alert_type: editingAlert.alert_type,
        threshold_value: editingAlert.alert_type === 'margin_percent'
          ? (editingAlert.threshold_value / 100).toString()
          : (editingAlert.threshold_value / 100).toString(),
        threshold_operator: editingAlert.threshold_operator,
        is_active: editingAlert.is_active,
        notify_email: editingAlert.notify_email,
        notify_in_app: editingAlert.notify_in_app,
      });
    } else {
      setFormData({
        alert_name: '',
        alert_type: 'total_cost',
        threshold_value: '',
        threshold_operator: '>',
        is_active: true,
        notify_email: true,
        notify_in_app: true,
      });
    }
  }, [editingAlert, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const thresholdValue = formData.alert_type === 'margin_percent'
        ? Math.round(parseFloat(formData.threshold_value) * 100)
        : Math.round(parseFloat(formData.threshold_value) * 100);

      const input: CreateAlertInput = {
        alert_name: formData.alert_name,
        alert_type: formData.alert_type,
        threshold_value: thresholdValue,
        threshold_operator: formData.threshold_operator,
        is_active: formData.is_active,
        notify_email: formData.notify_email,
        notify_in_app: formData.notify_in_app,
      };

      let success: boolean;
      if (editingAlert) {
        success = await updateAlert(editingAlert.id, input);
      } else {
        success = await createAlert(input);
      }

      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingAlert ? 'Editar Alerta' : 'Novo Alerta de Custo'}
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros do alerta de custo
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="alert_name">Nome do Alerta</Label>
              <Input
                id="alert_name"
                placeholder="Ex: Custo Alto Empresa X"
                value={formData.alert_name}
                onChange={(e) => setFormData({ ...formData, alert_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert_type">Tipo de Alerta</Label>
              <Select
                value={formData.alert_type}
                onValueChange={(value: 'total_cost' | 'margin_percent' | 'cost_category') =>
                  setFormData({ ...formData, alert_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_cost">Custo Total</SelectItem>
                  <SelectItem value="margin_percent">Margem %</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="operator">Condição</Label>
                <Select
                  value={formData.threshold_operator}
                  onValueChange={(value: '>' | '<' | '>=' | '<=') =>
                    setFormData({ ...formData, threshold_operator: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">Maior que (&gt;)</SelectItem>
                    <SelectItem value="<">Menor que (&lt;)</SelectItem>
                    <SelectItem value=">=">Maior ou igual (≥)</SelectItem>
                    <SelectItem value="<=">Menor ou igual (≤)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold_value">
                  {formData.alert_type === 'margin_percent' ? 'Valor (%)' : 'Valor (R$)'}
                </Label>
                <Input
                  id="threshold_value"
                  type="number"
                  step={formData.alert_type === 'margin_percent' ? '0.1' : '0.01'}
                  placeholder={formData.alert_type === 'margin_percent' ? '30' : '200.00'}
                  value={formData.threshold_value}
                  onChange={(e) => setFormData({ ...formData, threshold_value: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active" className="cursor-pointer">
                  Alerta Ativo
                </Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_in_app" className="cursor-pointer">
                  Notificar no Sistema
                </Label>
                <Switch
                  id="notify_in_app"
                  checked={formData.notify_in_app}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_in_app: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify_email" className="cursor-pointer">
                  Notificar por Email
                </Label>
                <Switch
                  id="notify_email"
                  checked={formData.notify_email}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_email: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : editingAlert ? 'Salvar' : 'Criar Alerta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
