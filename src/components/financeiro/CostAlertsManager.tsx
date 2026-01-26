import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  Plus, 
  Pencil, 
  Trash2, 
  Bell, 
  BellOff,
  History,
  RefreshCw 
} from 'lucide-react';
import { useCostAlerts, CostAlert } from '@/hooks/useCostAlerts';
import { CostAlertDialog } from './CostAlertDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function CostAlertsManager() {
  const {
    loading,
    alerts,
    alertHistory,
    fetchAlerts,
    fetchAlertHistory,
    deleteAlert,
    toggleAlertActive,
    formatCurrency,
  } = useCostAlerts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<CostAlert | null>(null);
  const [deleteAlertId, setDeleteAlertId] = useState<string | null>(null);

  const handleEdit = (alert: CostAlert) => {
    setEditingAlert(alert);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingAlert(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingAlert(null);
  };

  const handleDelete = async () => {
    if (deleteAlertId) {
      await deleteAlert(deleteAlertId);
      setDeleteAlertId(null);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'total_cost':
        return 'Custo Total';
      case 'margin_percent':
        return 'Margem %';
      case 'cost_category':
        return 'Categoria';
      default:
        return type;
    }
  };

  const getOperatorLabel = (operator: string) => {
    switch (operator) {
      case '>':
        return '>';
      case '<':
        return '<';
      case '>=':
        return '≥';
      case '<=':
        return '≤';
      default:
        return operator;
    }
  };

  const formatThreshold = (alert: CostAlert) => {
    if (alert.alert_type === 'margin_percent') {
      return `${getOperatorLabel(alert.threshold_operator)} ${(alert.threshold_value / 100).toFixed(1)}%`;
    }
    return `${getOperatorLabel(alert.threshold_operator)} ${formatCurrency(alert.threshold_value)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas de Custo
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure notificações quando custos ultrapassarem limites
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchAlerts()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Alerta
          </Button>
        </div>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas Configurados
          </CardTitle>
          <CardDescription>
            {alerts.length === 0 
              ? 'Nenhum alerta configurado' 
              : `${alerts.filter(a => a.is_active).length} de ${alerts.length} alertas ativos`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum alerta configurado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie alertas para ser notificado quando custos ultrapassarem limites
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Alerta
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead>Subconta</TableHead>
                    <TableHead className="text-center">Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.alert_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getAlertTypeLabel(alert.alert_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatThreshold(alert)}
                      </TableCell>
                      <TableCell>
                        {alert.company_id ? (
                          <span className="text-sm">Específica</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Todas</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={alert.is_active}
                          onCheckedChange={(checked) => toggleAlertActive(alert.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(alert)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteAlertId(alert.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alertas
          </CardTitle>
          <CardDescription>
            Últimos alertas disparados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alertHistory.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Nenhum alerta disparado ainda
            </div>
          ) : (
            <div className="space-y-3">
              {alertHistory.slice(0, 10).map((history) => (
                <div
                  key={history.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    history.read_at ? 'bg-muted/30' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                  }`}
                >
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    history.read_at ? 'text-muted-foreground' : 'text-yellow-600'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{history.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(history.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <CostAlertDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingAlert={editingAlert}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAlertId} onOpenChange={() => setDeleteAlertId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir alerta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O alerta será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
