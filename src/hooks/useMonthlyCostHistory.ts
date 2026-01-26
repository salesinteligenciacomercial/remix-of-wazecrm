import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MonthlyCompanyData {
  companyId: string;
  companyName: string;
  messagesSent: number;
  messagesReceived: number;
  mediaFiles: number;
  automationExecutions: number;
  monthlyValue: number;
  // Calculated fields
  totalCost: number;
  revenue: number;
  margin: number;
  marginPercent: number;
}

export interface MonthlyData {
  monthYear: string;
  monthDate: Date;
  companies: MonthlyCompanyData[];
  totals: {
    totalCost: number;
    totalRevenue: number;
    totalMargin: number;
  };
}

interface MonthlyCostRow {
  month_year: string;
  month_date: string;
  company_id: string;
  company_name: string;
  messages_sent: number;
  messages_received: number;
  media_files: number;
  automation_executions: number;
  monthly_value: number;
}

interface CostConfig {
  cost_per_message_sent: number;
  cost_per_message_received: number;
  cost_per_media_file: number;
  cost_per_automation: number;
  base_monthly_cost: number;
}

const DEFAULT_CONFIG: CostConfig = {
  cost_per_message_sent: 4,
  cost_per_message_received: 1,
  cost_per_media_file: 10,
  cost_per_automation: 2,
  base_monthly_cost: 2000,
};

export function useMonthlyCostHistory() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [costConfig, setCostConfig] = useState<CostConfig>(DEFAULT_CONFIG);

  const fetchCostConfig = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('cost_configuration')
        .select('cost_per_message_sent, cost_per_message_received, cost_per_media_file, cost_per_automation, base_monthly_cost')
        .eq('master_company_id', companyId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setCostConfig({
          cost_per_message_sent: data.cost_per_message_sent ?? DEFAULT_CONFIG.cost_per_message_sent,
          cost_per_message_received: data.cost_per_message_received ?? DEFAULT_CONFIG.cost_per_message_received,
          cost_per_media_file: data.cost_per_media_file ?? DEFAULT_CONFIG.cost_per_media_file,
          cost_per_automation: data.cost_per_automation ?? DEFAULT_CONFIG.cost_per_automation,
          base_monthly_cost: data.base_monthly_cost ?? DEFAULT_CONFIG.base_monthly_cost,
        });
      }
    } catch (error) {
      console.error('Error fetching cost config:', error);
    }
  }, []);

  const loadMonthlyData = useCallback(async (months: number = 6) => {
    setLoading(true);
    try {
      // Get master company ID
      const { data: companyId, error: companyError } = await supabase.rpc('get_my_company_id');
      if (companyError) throw companyError;
      if (!companyId) {
        toast({
          title: 'Erro',
          description: 'Empresa não encontrada',
          variant: 'destructive',
        });
        return;
      }

      // Fetch cost config first
      await fetchCostConfig(companyId);

      // Call the RPC function
      const { data, error } = await supabase.rpc('get_monthly_cost_comparison', {
        p_master_company_id: companyId,
        p_months: months,
      });

      if (error) throw error;

      // Group data by month
      const rawData = (data || []) as MonthlyCostRow[];
      const groupedByMonth = new Map<string, MonthlyCompanyData[]>();

      rawData.forEach((row) => {
        const monthKey = row.month_year;
        if (!groupedByMonth.has(monthKey)) {
          groupedByMonth.set(monthKey, []);
        }

        const messagesCost = 
          (row.messages_sent * costConfig.cost_per_message_sent) +
          (row.messages_received * costConfig.cost_per_message_received);
        const mediaCost = row.media_files * costConfig.cost_per_media_file;
        const automationCost = row.automation_executions * costConfig.cost_per_automation;
        const totalCost = messagesCost + mediaCost + automationCost + costConfig.base_monthly_cost;
        const revenue = Number(row.monthly_value) * 100; // Convert to cents
        const margin = revenue - totalCost;
        const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;

        groupedByMonth.get(monthKey)!.push({
          companyId: row.company_id,
          companyName: row.company_name,
          messagesSent: row.messages_sent,
          messagesReceived: row.messages_received,
          mediaFiles: row.media_files,
          automationExecutions: row.automation_executions,
          monthlyValue: row.monthly_value,
          totalCost,
          revenue,
          margin,
          marginPercent,
        });
      });

      // Convert to array and calculate totals
      const result: MonthlyData[] = Array.from(groupedByMonth.entries())
        .map(([monthYear, companies]) => {
          const totalCost = companies.reduce((sum, c) => sum + c.totalCost, 0);
          const totalRevenue = companies.reduce((sum, c) => sum + c.revenue, 0);
          const totalMargin = totalRevenue - totalCost;

          return {
            monthYear,
            monthDate: new Date(monthYear + '-01'),
            companies,
            totals: {
              totalCost,
              totalRevenue,
              totalMargin,
            },
          };
        })
        .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());

      setMonthlyData(result);
    } catch (error: any) {
      console.error('Error loading monthly data:', error);
      toast({
        title: 'Erro ao carregar dados mensais',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, fetchCostConfig, costConfig]);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatMonth = (monthYear: string): string => {
    const [year, month] = monthYear.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
  };

  return {
    loading,
    monthlyData,
    loadMonthlyData,
    formatCurrency,
    formatMonth,
  };
}
