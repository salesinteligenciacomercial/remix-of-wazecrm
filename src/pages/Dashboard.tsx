import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, DollarSign, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalLeads: number;
  totalValue: number;
  conversionRate: number;
  activeDeals: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    totalValue: 0,
    conversionRate: 0,
    activeDeals: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: leads } = await supabase
        .from("leads")
        .select("value, status");

      if (leads) {
        const totalLeads = leads.length;
        const totalValue = leads.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
        const activeDeals = leads.filter((l) => l.status !== "perdido" && l.status !== "ganho").length;
        const wonDeals = leads.filter((l) => l.status === "ganho").length;
        const conversionRate = totalLeads > 0 ? (wonDeals / totalLeads) * 100 : 0;

        setStats({
          totalLeads,
          totalValue,
          conversionRate: Math.round(conversionRate),
          activeDeals,
        });
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total de Leads",
      value: stats.totalLeads,
      icon: Users,
      description: "Leads ativos no sistema",
      color: "text-primary",
    },
    {
      title: "Valor em Negociação",
      value: `R$ ${stats.totalValue.toLocaleString("pt-BR")}`,
      icon: DollarSign,
      description: "Pipeline total",
      color: "text-success",
    },
    {
      title: "Taxa de Conversão",
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      description: "Conversão média",
      color: "text-accent",
    },
    {
      title: "Negócios Ativos",
      value: stats.activeDeals,
      icon: Target,
      description: "Em andamento",
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">Visão geral do seu pipeline de vendas</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="group relative overflow-hidden border-0 shadow-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="absolute inset-0 bg-gradient-card opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                {stat.title}
              </CardTitle>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br from-background to-muted group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-card overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-primary opacity-5 rounded-full blur-3xl" />
          <CardHeader className="relative">
            <CardTitle className="text-2xl font-bold">Bem-vindo ao CEUSIA CRM</CardTitle>
            <p className="text-muted-foreground mt-2">
              Sistema completo de gestão comercial com IA integrada
            </p>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="mt-0.5 p-1.5 rounded-md bg-primary/10">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Gerenciar leads em quadros Kanban</p>
                  <p className="text-sm text-muted-foreground">Organize suas oportunidades visualmente</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="mt-0.5 p-1.5 rounded-md bg-success/10">
                  <div className="h-2 w-2 rounded-full bg-success" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Centralizar conversas</p>
                  <p className="text-sm text-muted-foreground">WhatsApp, Instagram e Facebook em um só lugar</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="mt-0.5 p-1.5 rounded-md bg-warning/10">
                  <div className="h-2 w-2 rounded-full bg-warning" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Automatizar follow-ups</p>
                  <p className="text-sm text-muted-foreground">IA para gerenciar tarefas automaticamente</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="mt-0.5 p-1.5 rounded-md bg-info/10">
                  <div className="h-2 w-2 rounded-full bg-info" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Analisar performance</p>
                  <p className="text-sm text-muted-foreground">Relatórios inteligentes em tempo real</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card bg-gradient-primary text-primary-foreground overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <CardHeader className="relative">
            <CardTitle className="text-xl font-bold">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <div className="p-2 rounded-md bg-white/20">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Novos leads</p>
                  <p className="text-xs opacity-80">Hoje às 14:30</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <div className="p-2 rounded-md bg-white/20">
                  <Target className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Negócio fechado</p>
                  <p className="text-xs opacity-80">Hoje às 11:15</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                <div className="p-2 rounded-md bg-white/20">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Meta atingida</p>
                  <p className="text-xs opacity-80">Ontem às 18:20</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
