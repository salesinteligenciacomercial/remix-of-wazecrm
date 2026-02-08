import { useState } from "react";
import { Plus, X, Bell, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface LembreteAntecipado {
  id: string;
  dias: number;
  horas?: number;
  mensagem: string;
  ativo: boolean;
}

interface LembretesAntecipadosProps {
  lembretes: LembreteAntecipado[];
  onChange: (lembretes: LembreteAntecipado[]) => void;
  dataCompromisso: string;
  nomeCliente?: string;
}

const gerarId = () => Math.random().toString(36).substring(2, 9);

export function LembretesAntecipados({
  lembretes,
  onChange,
  dataCompromisso,
  nomeCliente = "Cliente"
}: LembretesAntecipadosProps) {
  const [expandido, setExpandido] = useState(false);
  const [novoDias, setNovoDias] = useState(1);
  const [novaMensagem, setNovaMensagem] = useState("");

  const adicionarLembrete = () => {
    if (novoDias < 1) return;
    
    const novoLembrete: LembreteAntecipado = {
      id: gerarId(),
      dias: novoDias,
      mensagem: novaMensagem.trim() || `Olá! Passando para lembrar que temos um compromisso daqui a ${novoDias} dia(s).`,
      ativo: true
    };

    onChange([...lembretes, novoLembrete].sort((a, b) => b.dias - a.dias));
    setNovoDias(1);
    setNovaMensagem("");
  };

  const removerLembrete = (id: string) => {
    onChange(lembretes.filter(l => l.id !== id));
  };

  const toggleLembrete = (id: string) => {
    onChange(lembretes.map(l => 
      l.id === id ? { ...l, ativo: !l.ativo } : l
    ));
  };

  const atualizarMensagem = (id: string, mensagem: string) => {
    onChange(lembretes.map(l => 
      l.id === id ? { ...l, mensagem } : l
    ));
  };

  const calcularDataEnvio = (diasAntecedencia: number): Date | null => {
    if (!dataCompromisso) return null;
    const data = new Date(dataCompromisso);
    data.setDate(data.getDate() - diasAntecedencia);
    return data;
  };

  const formatarDataEnvio = (diasAntecedencia: number): string => {
    const data = calcularDataEnvio(diasAntecedencia);
    if (!data) return "";
    return data.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const adicionarPreset = (diasPreset: number[]) => {
    const novosLembretes: LembreteAntecipado[] = diasPreset
      .filter(d => !lembretes.some(l => l.dias === d))
      .map(dias => ({
        id: gerarId(),
        dias,
        mensagem: dias === 0 
          ? `Olá ${nomeCliente}! Seu compromisso é HOJE. Estamos te esperando!`
          : dias === 1
          ? `Olá ${nomeCliente}! Amanhã é o dia do seu compromisso. Não esqueça!`
          : `Olá ${nomeCliente}! Passando para lembrar que seu compromisso é daqui a ${dias} dias.`,
        ativo: true
      }));

    onChange([...lembretes, ...novosLembretes].sort((a, b) => b.dias - a.dias));
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Lembretes Antecipados
          </Label>
          <p className="text-xs text-muted-foreground">
            Enviar lembretes antes da data principal
          </p>
        </div>
        <Switch 
          checked={expandido} 
          onCheckedChange={setExpandido}
        />
      </div>

      {expandido && (
        <div className="space-y-4 pt-2">
          {/* Presets rápidos */}
          <div className="flex flex-wrap gap-2">
            <p className="text-xs text-muted-foreground w-full mb-1">Adicionar rapidamente:</p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => adicionarPreset([3, 1, 0])}
              className="text-xs"
            >
              📅 3 dias + 1 dia + No dia
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => adicionarPreset([7, 3, 1])}
              className="text-xs"
            >
              📆 1 semana + 3 dias + 1 dia
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => adicionarPreset([1])}
              className="text-xs"
            >
              ⏰ 1 dia antes
            </Button>
          </div>

          {/* Lista de lembretes configurados */}
          {lembretes.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Lembretes configurados:</p>
              {lembretes.map((lembrete, index) => (
                <Card 
                  key={lembrete.id} 
                  className={`border-l-4 ${lembrete.ativo ? 'border-l-primary' : 'border-l-muted-foreground/30 opacity-60'}`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={lembrete.ativo ? "default" : "secondary"} className="text-xs">
                          {lembrete.dias === 0 ? "No dia" : `${lembrete.dias} dia${lembrete.dias > 1 ? 's' : ''} antes`}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatarDataEnvio(lembrete.dias)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch 
                          checked={lembrete.ativo}
                          onCheckedChange={() => toggleLembrete(lembrete.id)}
                          className="scale-75"
                        />
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removerLembrete(lembrete.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={lembrete.mensagem}
                      onChange={(e) => atualizarMensagem(lembrete.id, e.target.value)}
                      className="text-sm resize-none"
                      rows={2}
                      placeholder="Mensagem do lembrete..."
                      disabled={!lembrete.ativo}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Adicionar lembrete customizado */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Adicionar lembrete customizado:</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Dias antes</Label>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={novoDias}
                  onChange={(e) => setNovoDias(parseInt(e.target.value) || 0)}
                  className="w-full"
                />
              </div>
              <Button 
                type="button"
                variant="secondary" 
                size="sm"
                onClick={adicionarLembrete}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            {novoDias > 0 && dataCompromisso && (
              <p className="text-xs text-muted-foreground">
                Será enviado em: {formatarDataEnvio(novoDias)}
              </p>
            )}
          </div>

          {/* Resumo */}
          {lembretes.length > 0 && (
            <div className="bg-primary/10 rounded-md p-3 text-sm">
              <p className="font-medium text-primary">
                📋 Resumo: {lembretes.filter(l => l.ativo).length} lembrete(s) serão enviados
              </p>
              <ul className="text-xs text-primary/80 mt-1 space-y-0.5">
                {lembretes.filter(l => l.ativo).map((l, i) => (
                  <li key={l.id}>
                    {i + 1}º - {l.dias === 0 ? "No dia do compromisso" : `${l.dias} dia(s) antes`}: {formatarDataEnvio(l.dias)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LembretesAntecipados;
