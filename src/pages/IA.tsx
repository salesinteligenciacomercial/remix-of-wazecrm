import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Sparkles, TrendingUp, Target } from "lucide-react";

export default function IA() {
  const aiAgents = [
    {
      name: "IA de Atendimento",
      description: "Pré-atendimento e triagem inicial de contatos",
      icon: Bot,
      color: "bg-blue-500",
    },
    {
      name: "IA Vendedora",
      description: "Funil de conversão e negociação automatizada",
      icon: Sparkles,
      color: "bg-purple-500",
    },
    {
      name: "IA Analista",
      description: "Interpretação de conversas e relatórios inteligentes",
      icon: TrendingUp,
      color: "bg-orange-500",
    },
    {
      name: "IA de Suporte",
      description: "Resolução de dúvidas e pós-venda automatizado",
      icon: Bot,
      color: "bg-cyan-500",
    },
    {
      name: "IA de Qualificação",
      description: "Segmentação e classificação automática de leads",
      icon: Target,
      color: "bg-pink-500",
    },
    {
      name: "IA de Agendamento",
      description: "Marcação e follow-up de reuniões inteligente",
      icon: Bot,
      color: "bg-indigo-500",
    },
    {
      name: "IA de Follow-Up",
      description: "Reativação e acompanhamento automático",
      icon: Target,
      color: "bg-green-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Fluxos e Automação</h1>
        <p className="text-muted-foreground">
          Configure agentes de IA e automações comerciais
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {aiAgents.map((agent) => (
          <Card key={agent.name} className="transition-all hover:shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-lg ${agent.color} flex items-center justify-center`}>
                  <agent.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold">{agent.name}</div>
                  <div className="text-sm font-normal text-muted-foreground">
                    {agent.description}
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Configuração em desenvolvimento
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
