import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Sparkles, TrendingUp, Search } from "lucide-react";

export default function IA() {
  const aiAgents = [
    {
      name: "IA de Atendimento",
      description: "Responde automaticamente e qualifica leads",
      icon: Bot,
      color: "bg-blue-500",
    },
    {
      name: "IA Vendedora",
      description: "Conduz follow-ups e estratégias de fechamento",
      icon: Sparkles,
      color: "bg-purple-500",
    },
    {
      name: "IA de Prospecção",
      description: "Identifica e qualifica novos leads automaticamente",
      icon: Search,
      color: "bg-green-500",
    },
    {
      name: "IA Analista",
      description: "Analisa conversas e gera insights de performance",
      icon: TrendingUp,
      color: "bg-orange-500",
    },
    {
      name: "IA de Suporte",
      description: "Responde dúvidas frequentes automaticamente",
      icon: Bot,
      color: "bg-cyan-500",
    },
    {
      name: "IA de Qualificação",
      description: "Pontua leads por prontidão de compra",
      icon: TrendingUp,
      color: "bg-pink-500",
    },
    {
      name: "IA de Agendamento",
      description: "Sugere e confirma horários automaticamente",
      icon: Bot,
      color: "bg-indigo-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">IA & Automação</h1>
        <p className="text-muted-foreground">
          Seus assistentes inteligentes de vendas
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
