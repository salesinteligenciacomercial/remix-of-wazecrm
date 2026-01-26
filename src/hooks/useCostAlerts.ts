import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CostAlert {
  id: string;
  master_company_id: string;
  company_id: string | null;
  alert_name: string;
  alert_type: 'total_cost' | 'margin_percent' | 'cost_category';
  threshold_value: number;
  threshold_operator: '>' | '<' | '>=' | '<=';
  cost_category: string | null;
  is_active: boolean;
  notify_email: boolean;
  notify_in_app: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CostAlertHistory {
  id: string;
  alert_id: string;
  company_id: string | null;
  triggered_value: number;
  threshold_value: number;
  message: string;
  read_at: string | null;
  created_at: string;
}

export interface CreateAlertInput {
  company_id?: string | null;
  alert_name: string;
  alert_type: 'total_cost' | 'margin_percent' | 'cost_category';
  threshold_value: number;
  threshold_operator: '>' | '<' | '>=' | '<=';
  cost_category?: string | null;
  is_active?: boolean;
  notify_email?: boolean;
  notify_in_app?: boolean;
}

export function useCostAlerts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [alertHistory, setAlertHistory] = useState<CostAlertHistory[]>([]);
  const [masterCompanyId, setMasterCompanyId] = useState<string | null>(null);

  // Fetch master company ID
  const fetchMasterCompanyId = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_company_id');
      if (error) throw error;
      setMasterCompanyId(data);
      return data;
    } catch (error) {
      console.error('Error fetching company_id:', error);
      return null;
    }
  }, []);

  // Fetch all alerts
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const companyId = masterCompanyId || await fetchMasterCompanyId();
      if (!companyId) return;

      const { data, error } = await supabase
        .from('cost_alerts')
        .select('*')
        .eq('master_company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts((data || []) as CostAlert[]);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [masterCompanyId, fetchMasterCompanyId]);

  // Fetch alert history
  const fetchAlertHistory = useCallback(async (limit: number = 20) => {
    try {
      const companyId = masterCompanyId || await fetchMasterCompanyId();
      if (!companyId) return;

      const { data, error } = await supabase
        .from('cost_alert_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setAlertHistory((data || []) as CostAlertHistory[]);
    } catch (error) {
      console.error('Error fetching alert history:', error);
    }
  }, [masterCompanyId, fetchMasterCompanyId]);

  // Create new alert
  const createAlert = useCallback(async (input: CreateAlertInput): Promise<boolean> => {
    try {
      const companyId = masterCompanyId || await fetchMasterCompanyId();
      if (!companyId) {
        toast({
          title: 'Erro',
          description: 'Empresa não encontrada',
          variant: 'destructive',
        });
        return false;
      }

      const { error } = await supabase
        .from('cost_alerts')
        .insert({
          master_company_id: companyId,
          ...input,
        });

      if (error) throw error;

      toast({
        title: 'Alerta criado',
        description: 'O alerta de custo foi criado com sucesso.',
      });

      await fetchAlerts();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar alerta',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [masterCompanyId, fetchMasterCompanyId, fetchAlerts, toast]);

  // Update alert
  const updateAlert = useCallback(async (id: string, updates: Partial<CreateAlertInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cost_alerts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Alerta atualizado',
        description: 'O alerta foi atualizado com sucesso.',
      });

      await fetchAlerts();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar alerta',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchAlerts, toast]);

  // Delete alert
  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('cost_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Alerta excluído',
        description: 'O alerta foi removido com sucesso.',
      });

      await fetchAlerts();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir alerta',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchAlerts, toast]);

  // Toggle alert active status
  const toggleAlertActive = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    return updateAlert(id, { is_active: isActive });
  }, [updateAlert]);

  // Check alerts against current breakdowns
  const checkAlerts = useCallback(async (breakdowns: { companyId: string; companyName: string; totalCost: number; marginPercent: number }[]) => {
    const triggeredAlerts: { alert: CostAlert; company: string; value: number }[] = [];

    alerts.forEach((alert) => {
      if (!alert.is_active) return;

      const companiesToCheck = alert.company_id 
        ? breakdowns.filter(b => b.companyId === alert.company_id)
        : breakdowns;

      companiesToCheck.forEach((breakdown) => {
        let value: number;
        switch (alert.alert_type) {
          case 'total_cost':
            value = breakdown.totalCost;
            break;
          case 'margin_percent':
            value = breakdown.marginPercent * 100; // Convert to integer representation
            break;
          default:
            return;
        }

        let triggered = false;
        switch (alert.threshold_operator) {
          case '>':
            triggered = value > alert.threshold_value;
            break;
          case '<':
            triggered = value < alert.threshold_value;
            break;
          case '>=':
            triggered = value >= alert.threshold_value;
            break;
          case '<=':
            triggered = value <= alert.threshold_value;
            break;
        }

        if (triggered) {
          triggeredAlerts.push({
            alert,
            company: breakdown.companyName,
            value,
          });
        }
      });
    });

    return triggeredAlerts;
  }, [alerts]);

  // Mark history as read
  const markHistoryAsRead = useCallback(async (historyId: string) => {
    try {
      await supabase
        .from('cost_alert_history')
        .update({ read_at: new Date().toISOString() })
        .eq('id', historyId);
      
      await fetchAlertHistory();
    } catch (error) {
      console.error('Error marking history as read:', error);
    }
  }, [fetchAlertHistory]);

  // Format currency
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  // Initial load
  useEffect(() => {
    fetchAlerts();
    fetchAlertHistory();
  }, []);

  return {
    loading,
    alerts,
    alertHistory,
    activeAlertsCount: alerts.filter(a => a.is_active).length,
    fetchAlerts,
    fetchAlertHistory,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlertActive,
    checkAlerts,
    markHistoryAsRead,
    formatCurrency,
  };
}
