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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu pipeline de vendas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="transition-all hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-subtle">
        <CardHeader>
          <CardTitle>Bem-vindo ao CEUSIA CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Sistema completo de gestão comercial com IA integrada. Aqui você pode:
          </p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>Gerenciar leads em quadros Kanban personalizados</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>Centralizar conversas de WhatsApp, Instagram e Facebook</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>Automatizar follow-ups e tarefas com IA</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>Analisar performance com relatórios inteligentes</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
