import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Lead {
  id: string;
  name: string;
  company: string | null;
  value: number;
  stage: string;
}

const stages = [
  { id: "prospeccao", name: "Prospecção", color: "border-l-4 border-l-blue-500" },
  { id: "qualificacao", name: "Qualificação", color: "border-l-4 border-l-yellow-500" },
  { id: "proposta", name: "Proposta", color: "border-l-4 border-l-orange-500" },
  { id: "negociacao", name: "Negociação", color: "border-l-4 border-l-purple-500" },
  { id: "fechamento", name: "Fechamento", color: "border-l-4 border-l-green-500" },
];

export default function Kanban() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const fetchLeads = async () => {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setLeads(data);
      }
    };

    fetchLeads();
  }, []);

  const getLeadsByStage = (stageId: string) => {
    return leads.filter((lead) => lead.stage === stageId);
  };

  const getStageValue = (stageId: string) => {
    return getLeadsByStage(stageId).reduce((sum, lead) => sum + Number(lead.value), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads & Kanban</h1>
          <p className="text-muted-foreground">Gerencie seu pipeline de vendas</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          const stageValue = getStageValue(stage.id);

          return (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {stage.name}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {stageLeads.length}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    R$ {stageValue.toLocaleString("pt-BR")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stageLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      className={`${stage.color} cursor-pointer transition-all hover:shadow-md`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-medium text-sm">{lead.name}</h3>
                            {lead.company && (
                              <p className="text-xs text-muted-foreground">
                                {lead.company}
                              </p>
                            )}
                            <p className="text-sm font-semibold text-success">
                              R$ {Number(lead.value).toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                      Nenhum lead nesta etapa
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
