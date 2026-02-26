import { Handle, Position } from 'reactflow';
import { LayoutList } from 'lucide-react';

export function InteractiveMenuNode({ data }: any) {
  const buttons = data.buttons || [];

  return (
    <div className="px-6 py-4 shadow-lg rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 border-2 border-teal-400 min-w-[240px] max-w-[280px] break-words">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-teal-300 !border-2 !border-white"
      />
      
      <div className="flex items-center gap-3 text-white">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
          <LayoutList className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-90">
            Menu Interativo
          </div>
          <div className="font-bold text-sm">
            {data.label || 'Menu com Botões'}
          </div>
        </div>
      </div>
      
      {buttons.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {buttons.map((btn: any, i: number) => (
            <div key={btn.id || i} className="relative flex items-center">
              <div className="text-[10px] bg-white/15 rounded px-2 py-1 text-white/90 flex-1">
                {i + 1}️⃣ {btn.label || `Botão ${i + 1}`}
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={`btn_${i}`}
                className="!w-2.5 !h-2.5 !bg-white !border-2 !border-teal-300 !relative !right-[-12px] !top-auto !transform-none"
                style={{ position: 'relative', right: -12, top: 'auto', transform: 'none' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Default output handle (fallback / no match) */}
      <div className="mt-2 flex items-center justify-end">
        <span className="text-[9px] text-white/50 mr-1">padrão</span>
        <Handle
          type="source"
          position={Position.Right}
          id="default"
          className="!w-2.5 !h-2.5 !bg-teal-300 !border-2 !border-white !relative !right-[-12px] !top-auto !transform-none"
          style={{ position: 'relative', right: -12, top: 'auto', transform: 'none' }}
        />
      </div>
    </div>
  );
}
