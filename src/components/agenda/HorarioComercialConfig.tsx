import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Sun, Moon, Coffee } from "lucide-react";

interface PeriodoHorario {
  inicio: string;
  fim: string;
  ativo: boolean;
}

export interface HorarioComercial {
  manha: PeriodoHorario;
  tarde: PeriodoHorario;
  noite: PeriodoHorario;
  intervalo_almoco: {
    inicio: string;
    fim: string;
    ativo: boolean;
  };
}

interface HorarioComercialConfigProps {
  horario: HorarioComercial;
  onChange: (horario: HorarioComercial) => void;
}

export function HorarioComercialConfig({ horario, onChange }: HorarioComercialConfigProps) {
  const [config, setConfig] = useState<HorarioComercial>(horario);

  const updateConfig = (updates: Partial<HorarioComercial>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const updatePeriodo = (periodo: 'manha' | 'tarde' | 'noite', updates: Partial<PeriodoHorario>) => {
    const newConfig = {
      ...config,
      [periodo]: { ...config[periodo], ...updates }
    };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const updateIntervaloAlmoco = (updates: Partial<HorarioComercial['intervalo_almoco']>) => {
    const newConfig = {
      ...config,
      intervalo_almoco: { ...config.intervalo_almoco, ...updates }
    };
    setConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <div className="space-y-2">
      {/* Período Manhã */}
      <Card className="border">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5 text-yellow-500" />
              <CardTitle className="text-xs font-medium">Manhã</CardTitle>
            </div>
            <Switch
              checked={config.manha.ativo}
              onCheckedChange={(checked) => updatePeriodo('manha', { ativo: checked })}
              className="scale-75"
            />
          </div>
        </CardHeader>
        {config.manha.ativo && (
          <CardContent className="pt-0 px-3 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="manha-inicio" className="text-xs">Início</Label>
                <Input
                  id="manha-inicio"
                  type="time"
                  value={config.manha.inicio}
                  onChange={(e) => updatePeriodo('manha', { inicio: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="manha-fim" className="text-xs">Fim</Label>
                <Input
                  id="manha-fim"
                  type="time"
                  value={config.manha.fim}
                  onChange={(e) => updatePeriodo('manha', { fim: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Intervalo de Almoço */}
      {config.manha.ativo && (
        <Card className="border">
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="h-3.5 w-3.5 text-orange-500" />
                <CardTitle className="text-xs font-medium">Intervalo de Almoço</CardTitle>
              </div>
              <Switch
                checked={config.intervalo_almoco.ativo}
                onCheckedChange={(checked) => updateIntervaloAlmoco({ ativo: checked })}
                className="scale-75"
              />
            </div>
          </CardHeader>
          {config.intervalo_almoco.ativo && (
            <CardContent className="pt-0 px-3 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="almoco-inicio" className="text-xs">Início</Label>
                  <Input
                    id="almoco-inicio"
                    type="time"
                    value={config.intervalo_almoco.inicio}
                    onChange={(e) => updateIntervaloAlmoco({ inicio: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="almoco-fim" className="text-xs">Fim</Label>
                  <Input
                    id="almoco-fim"
                    type="time"
                    value={config.intervalo_almoco.fim}
                    onChange={(e) => updateIntervaloAlmoco({ fim: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Período Tarde */}
      <Card className="border">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <CardTitle className="text-xs font-medium">Tarde</CardTitle>
            </div>
            <Switch
              checked={config.tarde.ativo}
              onCheckedChange={(checked) => updatePeriodo('tarde', { ativo: checked })}
              className="scale-75"
            />
          </div>
        </CardHeader>
        {config.tarde.ativo && (
          <CardContent className="pt-0 px-3 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="tarde-inicio" className="text-xs">Início</Label>
                <Input
                  id="tarde-inicio"
                  type="time"
                  value={config.tarde.inicio}
                  onChange={(e) => updatePeriodo('tarde', { inicio: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tarde-fim" className="text-xs">Fim</Label>
                <Input
                  id="tarde-fim"
                  type="time"
                  value={config.tarde.fim}
                  onChange={(e) => updatePeriodo('tarde', { fim: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Período Noite (Opcional) */}
      <Card className="border">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5 text-indigo-500" />
              <CardTitle className="text-xs font-medium">Noite (Opcional)</CardTitle>
            </div>
            <Switch
              checked={config.noite.ativo}
              onCheckedChange={(checked) => updatePeriodo('noite', { ativo: checked })}
              className="scale-75"
            />
          </div>
        </CardHeader>
        {config.noite.ativo && (
          <CardContent className="pt-0 px-3 pb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="noite-inicio" className="text-xs">Início</Label>
                <Input
                  id="noite-inicio"
                  type="time"
                  value={config.noite.inicio}
                  onChange={(e) => updatePeriodo('noite', { inicio: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="noite-fim" className="text-xs">Fim</Label>
                <Input
                  id="noite-fim"
                  type="time"
                  value={config.noite.fim}
                  onChange={(e) => updatePeriodo('noite', { fim: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Depende da agenda/empresa - alguns profissionais atendem até mais tarde
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// Função helper para criar configuração padrão
export function criarHorarioPadrao(): HorarioComercial {
  return {
    manha: {
      inicio: "07:00",
      fim: "12:00",
      ativo: true,
    },
    tarde: {
      inicio: "14:00",
      fim: "18:00",
      ativo: true,
    },
    noite: {
      inicio: "19:00",
      fim: "23:00",
      ativo: false, // Opcional, desativado por padrão
    },
    intervalo_almoco: {
      inicio: "12:00",
      fim: "14:00",
      ativo: true,
    },
  };
}

// Função helper para converter de formato antigo para novo
export function converterHorarioAntigo(horarioAntigo: any): HorarioComercial {
  if (horarioAntigo?.periodos) {
    // Já está no formato novo
    return horarioAntigo;
  }

  // Converter formato antigo (horario_inicio, horario_fim) para novo
  const inicio = horarioAntigo?.horario_inicio || "08:00";
  const fim = horarioAntigo?.horario_fim || "18:00";

  return {
    manha: {
      inicio: inicio,
      fim: "12:00",
      ativo: true,
    },
    tarde: {
      inicio: "14:00",
      fim: fim,
      ativo: true,
    },
    noite: {
      inicio: "19:00",
      fim: "23:00",
      ativo: false,
    },
    intervalo_almoco: {
      inicio: "12:00",
      fim: "14:00",
      ativo: true,
    },
  };
}

