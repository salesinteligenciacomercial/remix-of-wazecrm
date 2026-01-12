import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Users, Target, Clock, ArrowUpRight, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface KPIsDashboardProps {
  companyId: string | null;
}

interface Funil {
  id: string;
  nome: string;
}

interface Etapa {
  id: string;
  nome: string;
  cor: string | null;
  posicao: number | null;
}

interface KPIs {
  totalLeads: number;
  leadsThisMonth: number;
  conversionRate: number;
  avgTimeInFunnel: number;
  leadsByStage: { stage: string; stageId: string; count: number; color: string }[];
}

export function KPIsDashboard({ companyId }: KPIsDashboardProps) {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [selectedFunilId, setSelectedFunilId] = useState<string>("");

  useEffect(() => {
    if (companyId) {
      loadFunis();
    }
  }, [companyId]);

  useEffect(() => {
    if (selectedFunilId) {
      loadEtapas();
      loadKPIs();
    }
  }, [selectedFunilId]);

  const loadFunis = async () => {
    if (!companyId) return;
    
    const { data, error } = await supabase
      .from('funis')
      .select('id, nome')
      .eq('company_id', companyId)
      .order('nome');
    
    if (data && data.length > 0) {
      setFunis(data);
      // Selecionar primeiro funil automaticamente
      if (!selectedFunilId) {
        setSelectedFunilId(data[0].id);
      }
    } else {
      setLoading(false);
    }
  };

  const loadEtapas = async () => {
    if (!selectedFunilId) return;
    
    const { data } = await supabase
      .from('etapas')
      .select('id, nome, cor, posicao')
      .eq('funil_id', selectedFunilId)
      .order('posicao');
    
    setEtapas(data || []);
  };

  const loadKPIs = async () => {
    if (!companyId || !selectedFunilId) return;
    setLoading(true);

    try {
      // Total leads no funil selecionado
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('funil_id', selectedFunilId);

      // Leads this month no funil
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: leadsThisMonth } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('funil_id', selectedFunilId)
        .gte('created_at', startOfMonth.toISOString());

      // Buscar etapas do funil
      const { data: etapasData } = await supabase
        .from('etapas')
        .select('id, nome, cor, posicao')
        .eq('funil_id', selectedFunilId)
        .order('posicao');

      // Leads por etapa
      const { data: leadsData } = await supabase
        .from('leads')
        .select('etapa_id')
        .eq('company_id', companyId)
        .eq('funil_id', selectedFunilId);

      const etapaCountMap: Record<string, number> = {};
      leadsData?.forEach(lead => {
        if (lead.etapa_id) {
          etapaCountMap[lead.etapa_id] = (etapaCountMap[lead.etapa_id] || 0) + 1;
        }
      });

      const stageColors = [
        '#3b82f6', '#22c55e', '#eab308', '#a855f7', 
        '#f97316', '#06b6d4', '#ec4899', '#6366f1'
      ];

      const leadsByStage = (etapasData || []).map((etapa, index) => ({
        stage: etapa.nome,
        stageId: etapa.id,
        count: etapaCountMap[etapa.id] || 0,
        color: etapa.cor || stageColors[index % stageColors.length]
      }));

      // Taxa de conversão (última etapa)
      const lastEtapa = etapasData?.[etapasData.length - 1];
      const convertedLeads = lastEtapa ? (etapaCountMap[lastEtapa.id] || 0) : 0;
      const conversionRate = totalLeads ? (convertedLeads / totalLeads) * 100 : 0;

      setKpis({
        totalLeads: totalLeads || 0,
        leadsThisMonth: leadsThisMonth || 0,
        conversionRate,
        avgTimeInFunnel: 0,
        leadsByStage
      });
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (funis.length === 0 && !loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum funil encontrado</p>
        <p className="text-sm">Crie um funil para visualizar os KPIs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Funil */}
      <div className="flex items-center gap-3">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">Selecionar Funil:</span>
        <Select value={selectedFunilId} onValueChange={setSelectedFunilId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Selecione um funil" />
          </SelectTrigger>
          <SelectContent>
            {funis.map((funil) => (
              <SelectItem key={funil.id} value={funil.id}>
                {funil.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p>Carregando KPIs...</p>
        </div>
      ) : !kpis ? (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Sem dados suficientes</p>
          <p className="text-sm">Adicione leads ao funil para visualizar os KPIs</p>
        </div>
      ) : (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total de Leads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{kpis.totalLeads}</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  Leads este Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-500">{kpis.leadsThisMonth}</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Taxa de Conversão
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{kpis.conversionRate.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo Médio no Funil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">-</p>
                <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
              </CardContent>
            </Card>
          </div>

          {/* Leads por Etapa do Funil */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Leads por Etapa do Funil</CardTitle>
            </CardHeader>
            <CardContent>
              {kpis.leadsByStage.length > 0 ? (
                <div className="space-y-3">
                  {kpis.leadsByStage.map((item) => {
                    const percentage = kpis.totalLeads ? (item.count / kpis.totalLeads) * 100 : 0;
                    return (
                      <div key={item.stageId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{item.stage}</span>
                          <span className="text-muted-foreground">{item.count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500 rounded-full"
                            style={{ 
                              width: `${Math.max(percentage, 2)}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhuma etapa encontrada neste funil</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
