import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CostConfiguration {
  id: string;
  master_company_id: string;
  cost_per_lead: number;
  cost_per_user: number;
  cost_per_message_sent: number;
  cost_per_message_received: number;
  cost_per_media_file: number;
  cost_per_gb_storage: number;
  cost_per_edge_call: number;
  cost_per_ia_request: number;
  cost_per_automation: number;
  base_monthly_cost: number;
  whatsapp_utility_cost: number;
  whatsapp_marketing_cost: number;
  whatsapp_auth_cost: number;
  updated_at: string;
}

export interface SubcontaUsage {
  company_id: string;
  company_name: string;
  company_status: string;
  total_leads: number;
  total_users: number;
  messages_sent: number;
  messages_received: number;
  media_files: number;
  automation_executions: number;
  monthly_value: number;
  subscription_status: string;
}

export interface CompanyCostBreakdown {
  companyId: string;
  companyName: string;
  companyStatus: string;
  // Usage metrics
  totalLeads: number;
  totalUsers: number;
  messagesSent: number;
  messagesReceived: number;
  mediaFiles: number;
  automationExecutions: number;
  // Calculated costs (in cents)
  leadsCost: number;
  usersCost: number;
  messagesCost: number;
  mediaCost: number;
  automationCost: number;
  baseCost: number;
  totalCost: number;
  // Revenue
  monthlyRevenue: number;
  subscriptionStatus: string;
  // Margin
  margin: number;
  marginPercent: number;
}

export interface CostSummary {
  totalCost: number;
  averageCost: number;
  totalRevenue: number;
  totalMargin: number;
  averageMarginPercent: number;
  grossProfit: number;
  subcontasCount: number;
  subcontasWithNegativeMargin: number;
}

const DEFAULT_CONFIG: Omit<CostConfiguration, 'id' | 'master_company_id' | 'updated_at'> = {
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
};

export function useCompanyCosts() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [masterCompanyId, setMasterCompanyId] = useState<string | null>(null);
  const [costConfig, setCostConfig] = useState<CostConfiguration | null>(null);
  const [subcontasUsage, setSubcontasUsage] = useState<SubcontaUsage[]>([]);
  const [costBreakdowns, setCostBreakdowns] = useState<CompanyCostBreakdown[]>([]);
  const [summary, setSummary] = useState<CostSummary>({
    totalCost: 0,
    averageCost: 0,
    totalRevenue: 0,
    totalMargin: 0,
    averageMarginPercent: 0,
    grossProfit: 0,
    subcontasCount: 0,
    subcontasWithNegativeMargin: 0,
  });

  // Fetch master company ID
  const fetchMasterCompanyId = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_company_id');
      if (error) throw error;
      setMasterCompanyId(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar company_id:', error);
      return null;
    }
  }, []);

  // Fetch cost configuration
  const fetchCostConfig = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('cost_configuration')
        .select('*')
        .eq('master_company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setCostConfig(data as CostConfiguration);
        return data as CostConfiguration;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar configuração de custos:', error);
      return null;
    }
  }, []);

  // Create default cost configuration
  const createDefaultConfig = useCallback(async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from('cost_configuration')
        .insert({
          master_company_id: companyId,
          ...DEFAULT_CONFIG,
        })
        .select()
        .single();

      if (error) throw error;
      setCostConfig(data as CostConfiguration);
      return data as CostConfiguration;
    } catch (error) {
      console.error('Erro ao criar configuração padrão:', error);
      return null;
    }
  }, []);

  // Update cost configuration
  const updateCostConfig = useCallback(async (updates: Partial<CostConfiguration>) => {
    if (!costConfig?.id) return false;

    try {
      const { error } = await supabase
        .from('cost_configuration')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', costConfig.id);

      if (error) throw error;

      toast({
        title: 'Configuração atualizada',
        description: 'Os custos unitários foram salvos com sucesso.',
      });

      // Reload config
      if (masterCompanyId) {
        await fetchCostConfig(masterCompanyId);
      }

      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar configuração',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [costConfig, masterCompanyId, fetchCostConfig, toast]);

  // Fetch subcontas usage using RPC
  const fetchSubcontasUsage = useCallback(async (
    companyId: string,
    startDate: Date,
    endDate: Date
  ) => {
    try {
      const { data, error } = await supabase.rpc('get_subcontas_with_usage', {
        p_master_company_id: companyId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0],
      });

      if (error) throw error;
      setSubcontasUsage((data || []) as SubcontaUsage[]);
      return data as SubcontaUsage[];
    } catch (error) {
      console.error('Erro ao buscar uso das subcontas:', error);
      return [];
    }
  }, []);

  // Calculate costs for all subcontas
  const calculateCosts = useCallback((
    usage: SubcontaUsage[],
    config: CostConfiguration | null
  ): CompanyCostBreakdown[] => {
    const effectiveConfig = config || { ...DEFAULT_CONFIG } as any;

    return usage.map((sub) => {
      const leadsCost = sub.total_leads * effectiveConfig.cost_per_lead;
      const usersCost = sub.total_users * effectiveConfig.cost_per_user;
      const messagesCost = 
        (sub.messages_sent * effectiveConfig.cost_per_message_sent) +
        (sub.messages_received * effectiveConfig.cost_per_message_received);
      const mediaCost = sub.media_files * effectiveConfig.cost_per_media_file;
      const automationCost = sub.automation_executions * effectiveConfig.cost_per_automation;
      const baseCost = effectiveConfig.base_monthly_cost;

      const totalCost = leadsCost + usersCost + messagesCost + mediaCost + automationCost + baseCost;
      const monthlyRevenue = Number(sub.monthly_value) * 100; // Convert to cents
      const margin = monthlyRevenue - totalCost;
      const marginPercent = monthlyRevenue > 0 ? (margin / monthlyRevenue) * 100 : 0;

      return {
        companyId: sub.company_id,
        companyName: sub.company_name,
        companyStatus: sub.company_status,
        totalLeads: sub.total_leads,
        totalUsers: sub.total_users,
        messagesSent: sub.messages_sent,
        messagesReceived: sub.messages_received,
        mediaFiles: sub.media_files,
        automationExecutions: sub.automation_executions,
        leadsCost,
        usersCost,
        messagesCost,
        mediaCost,
        automationCost,
        baseCost,
        totalCost,
        monthlyRevenue,
        subscriptionStatus: sub.subscription_status,
        margin,
        marginPercent,
      };
    });
  }, []);

  // Calculate summary
  const calculateSummary = useCallback((breakdowns: CompanyCostBreakdown[]): CostSummary => {
    if (breakdowns.length === 0) {
      return {
        totalCost: 0,
        averageCost: 0,
        totalRevenue: 0,
        totalMargin: 0,
        averageMarginPercent: 0,
        grossProfit: 0,
        subcontasCount: 0,
        subcontasWithNegativeMargin: 0,
      };
    }

    const totalCost = breakdowns.reduce((sum, b) => sum + b.totalCost, 0);
    const totalRevenue = breakdowns.reduce((sum, b) => sum + b.monthlyRevenue, 0);
    const totalMargin = totalRevenue - totalCost;
    const averageMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    const subcontasWithNegativeMargin = breakdowns.filter(b => b.margin < 0).length;

    return {
      totalCost,
      averageCost: totalCost / breakdowns.length,
      totalRevenue,
      totalMargin,
      averageMarginPercent,
      grossProfit: totalMargin,
      subcontasCount: breakdowns.length,
      subcontasWithNegativeMargin,
    };
  }, []);

  // Load all data
  const loadData = useCallback(async (startDate?: Date, endDate?: Date) => {
    setLoading(true);
    try {
      const companyId = masterCompanyId || await fetchMasterCompanyId();
      if (!companyId) return;

      // Get date range (default: current month)
      const now = new Date();
      const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Load config and usage in parallel
      let config = await fetchCostConfig(companyId);
      if (!config) {
        config = await createDefaultConfig(companyId);
      }

      const usage = await fetchSubcontasUsage(companyId, start, end);

      // Calculate costs
      const breakdowns = calculateCosts(usage, config);
      setCostBreakdowns(breakdowns);

      // Calculate summary
      const summaryData = calculateSummary(breakdowns);
      setSummary(summaryData);
    } finally {
      setLoading(false);
    }
  }, [
    masterCompanyId,
    fetchMasterCompanyId,
    fetchCostConfig,
    createDefaultConfig,
    fetchSubcontasUsage,
    calculateCosts,
    calculateSummary,
  ]);

  // Recalculate when config changes
  const recalculateCosts = useCallback(() => {
    if (subcontasUsage.length > 0) {
      const breakdowns = calculateCosts(subcontasUsage, costConfig);
      setCostBreakdowns(breakdowns);
      const summaryData = calculateSummary(breakdowns);
      setSummary(summaryData);
    }
  }, [subcontasUsage, costConfig, calculateCosts, calculateSummary]);

  // Format cents to BRL
  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  return {
    loading,
    costConfig,
    costBreakdowns,
    summary,
    loadData,
    updateCostConfig,
    recalculateCosts,
    formatCurrency,
    DEFAULT_CONFIG,
  };
}
