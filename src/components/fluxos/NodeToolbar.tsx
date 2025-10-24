import { Node, Edge } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Zap, Send, GitBranch, Bot, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface NodeToolbarProps {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export function NodeToolbar({ setNodes, setEdges }: NodeToolbarProps) {
  const addNode = (type: 'trigger' | 'action' | 'condition' | 'ia') => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { 
        x: Math.random() * 400 + 100, 
        y: Math.random() * 400 + 100 
      },
      data: { 
        label: `Novo ${type === 'trigger' ? 'Gatilho' : type === 'action' ? 'Ação' : type === 'condition' ? 'Condição' : 'IA'}`,
        [type === 'trigger' ? 'triggerType' : type === 'action' ? 'actionType' : type === 'condition' ? 'conditionType' : 'mode']: 
          type === 'trigger' ? 'nova_mensagem' : type === 'action' ? 'enviar_mensagem' : type === 'condition' ? 'tag' : 'auto'
      },
    };

    setNodes((nds) => [...nds, newNode]);
    toast.success(`${type === 'trigger' ? 'Gatilho' : type === 'action' ? 'Ação' : type === 'condition' ? 'Condição' : 'Card IA'} adicionado!`);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-slate-900/95 backdrop-blur-sm p-2 rounded-lg border border-slate-700 shadow-xl">
      <div className="flex items-center gap-1 px-2">
        <Plus className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-400">ADICIONAR:</span>
      </div>
      
      <Button
        onClick={() => addNode('trigger')}
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        <Zap className="h-4 w-4 mr-1" />
        Gatilho
      </Button>

      <Button
        onClick={() => addNode('action')}
        size="sm"
        className="bg-amber-600 hover:bg-amber-700 text-white"
      >
        <Send className="h-4 w-4 mr-1" />
        Ação
      </Button>

      <Button
        onClick={() => addNode('condition')}
        size="sm"
        className="bg-violet-600 hover:bg-violet-700 text-white"
      >
        <GitBranch className="h-4 w-4 mr-1" />
        Condição
      </Button>

      <Button
        onClick={() => addNode('ia')}
        size="sm"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Bot className="h-4 w-4 mr-1" />
        IA
      </Button>
    </div>
  );
}
