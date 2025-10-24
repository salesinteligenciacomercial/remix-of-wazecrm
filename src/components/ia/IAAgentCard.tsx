import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Activity, Zap } from "lucide-react";
import { toast } from "sonner";

interface IAAgentCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  active: boolean;
  onToggle: (id: string, active: boolean) => void;
  stats?: {
    conversationsHandled: number;
    avgResponseTime: string;
    successRate: string;
  };
}

export function IAAgentCard({ 
  id, 
  name, 
  description, 
  icon: Icon, 
  color, 
  active,
  onToggle,
  stats 
}: IAAgentCardProps) {
  const [configOpen, setConfigOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  const handleToggle = () => {
    const newState = !active;
    onToggle(id, newState);
    toast.success(newState ? `${name} ativada!` : `${name} desativada`);
  };

  const handleSaveConfig = () => {
    toast.success("Configurações salvas!");
    setConfigOpen(false);
  };

  return (
    <Card className="group relative overflow-hidden border-0 shadow-card hover:shadow-lg transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-card opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{name}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {active && <Badge className="bg-success animate-pulse">Ativa</Badge>}
            <Switch checked={active} onCheckedChange={handleToggle} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {stats && active && (
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.conversationsHandled}</div>
              <div className="text-xs text-muted-foreground">Conversas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{stats.avgResponseTime}</div>
              <div className="text-xs text-muted-foreground">Resp. Média</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.successRate}</div>
              <div className="text-xs text-muted-foreground">Taxa Sucesso</div>
            </div>
          </div>
        )}

        {active && (
          <div className="flex gap-2">
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Configurações - {name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Prompt Personalizado</Label>
                    <Textarea
                      placeholder="Personalize o comportamento da IA..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      rows={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Defina instruções específicas para como a IA deve se comportar nas conversas.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Modo de Operação</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Switch id={`${id}-auto`} defaultChecked />
                        <Label htmlFor={`${id}-auto`}>Resposta Automática</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Switch id={`${id}-suggest`} />
                        <Label htmlFor={`${id}-suggest`}>Apenas Sugestões</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Transferência Automática</Label>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <Switch id={`${id}-transfer`} defaultChecked />
                      <Label htmlFor={`${id}-transfer`}>
                        Transferir para humano quando não souber responder
                      </Label>
                    </div>
                  </div>

                  <Button onClick={handleSaveConfig} className="w-full">
                    Salvar Configurações
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Logs
            </Button>
          </div>
        )}

        {!active && (
          <div className="text-center p-4 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Ative para começar a usar</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
