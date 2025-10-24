import { Node } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings2 } from 'lucide-react';

interface NodePropertiesPanelProps {
  selectedNode: Node | null;
  onUpdate: (node: Node) => void;
}

export function NodePropertiesPanel({ selectedNode, onUpdate }: NodePropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <Card className="w-80 border-0 bg-slate-900 text-white">
        <CardContent className="flex flex-col items-center justify-center h-full py-12">
          <Settings2 className="h-12 w-12 text-slate-600 mb-4" />
          <p className="text-sm text-slate-400 text-center">
            Selecione um card no canvas para editar suas propriedades
          </p>
        </CardContent>
      </Card>
    );
  }

  const updateNodeData = (key: string, value: any) => {
    const updatedNode = {
      ...selectedNode,
      data: { ...selectedNode.data, [key]: value },
    };
    onUpdate(updatedNode);
  };

  const renderProperties = () => {
    switch (selectedNode.type) {
      case 'trigger':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-white">Tipo de Gatilho</Label>
              <Select 
                value={selectedNode.data.triggerType} 
                onValueChange={(v) => updateNodeData('triggerType', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="nova_mensagem">Nova mensagem recebida</SelectItem>
                  <SelectItem value="novo_lead">Novo lead criado</SelectItem>
                  <SelectItem value="lead_movido">Lead movido no funil</SelectItem>
                  <SelectItem value="horario">Em horário específico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Título</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => updateNodeData('label', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Ex: Nova mensagem WhatsApp"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Descrição</Label>
              <Textarea
                value={selectedNode.data.description || ''}
                onChange={(e) => updateNodeData('description', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Descreva quando este gatilho será acionado..."
                rows={3}
              />
            </div>
          </>
        );

      case 'action':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-white">Tipo de Ação</Label>
              <Select 
                value={selectedNode.data.actionType} 
                onValueChange={(v) => updateNodeData('actionType', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="enviar_mensagem">Enviar mensagem</SelectItem>
                  <SelectItem value="criar_lead">Criar lead</SelectItem>
                  <SelectItem value="criar_tarefa">Criar tarefa</SelectItem>
                  <SelectItem value="mover_funil">Mover no funil</SelectItem>
                  <SelectItem value="notificar_usuario">Notificar usuário</SelectItem>
                  <SelectItem value="adicionar_nota">Adicionar nota</SelectItem>
                  <SelectItem value="acionar_ia">Acionar IA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Título</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => updateNodeData('label', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Ex: Enviar mensagem de boas-vindas"
              />
            </div>
            {selectedNode.data.actionType === 'enviar_mensagem' && (
              <div className="space-y-2">
                <Label className="text-white">Mensagem</Label>
                <Textarea
                  value={selectedNode.data.message || ''}
                  onChange={(e) => updateNodeData('message', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="Digite a mensagem..."
                  rows={4}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-white">Descrição</Label>
              <Textarea
                value={selectedNode.data.description || ''}
                onChange={(e) => updateNodeData('description', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Descreva o que esta ação faz..."
                rows={2}
              />
            </div>
          </>
        );

      case 'condition':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-white">Tipo de Condição</Label>
              <Select 
                value={selectedNode.data.conditionType} 
                onValueChange={(v) => updateNodeData('conditionType', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="tag">Verificar tag</SelectItem>
                  <SelectItem value="etapa">Verificar etapa</SelectItem>
                  <SelectItem value="horario">Verificar horário</SelectItem>
                  <SelectItem value="palavra_chave">Palavra-chave na mensagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Título</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => updateNodeData('label', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Ex: Cliente tem tag VIP?"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Valor a Verificar</Label>
              <Input
                value={selectedNode.data.checkValue || ''}
                onChange={(e) => updateNodeData('checkValue', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Ex: VIP, orçamento, 09:00-18:00"
              />
            </div>
          </>
        );

      case 'ia':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-white">Título</Label>
              <Input
                value={selectedNode.data.label || ''}
                onChange={(e) => updateNodeData('label', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Ex: IA Atendimento Inicial"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Prompt Personalizado</Label>
              <Textarea
                value={selectedNode.data.prompt || ''}
                onChange={(e) => updateNodeData('prompt', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Você é um assistente que... [defina o comportamento da IA]"
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Modo de Operação</Label>
              <Select 
                value={selectedNode.data.mode || 'auto'} 
                onValueChange={(v) => updateNodeData('mode', v)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="auto">🤖 Resposta Automática</SelectItem>
                  <SelectItem value="assisted">👤 Resposta Assistida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between space-y-2">
              <Label className="text-white">Aprendizado Ativo</Label>
              <Switch
                checked={selectedNode.data.learning || false}
                onCheckedChange={(v) => updateNodeData('learning', v)}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-80 border-0 bg-slate-900 text-white overflow-auto">
      <CardHeader className="border-b border-slate-800">
        <CardTitle className="flex items-center gap-2 text-white">
          <Settings2 className="h-5 w-5" />
          Propriedades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {renderProperties()}
      </CardContent>
    </Card>
  );
}
