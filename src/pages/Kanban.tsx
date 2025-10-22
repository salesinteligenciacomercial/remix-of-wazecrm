import { useState, useEffect } from "react";
import { DndContext, DragEndEvent, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { LeadCard } from "@/components/funil/LeadCard";
import { NovoLeadDialog } from "@/components/funil/NovoLeadDialog";
import { toast } from "sonner";

interface Lead {
  id: string;
  nome: string;
  name: string;
  company?: string;
  value?: number;
  telefone?: string;
  email?: string;
  cpf?: string;
  source?: string;
  notes?: string;
  etapa_id?: string;
  funil_id?: string;
}

interface Etapa {
  id: string;
  nome: string;
  posicao: number;
  cor: string;
  funil_id: string;
}

interface Funil {
  id: string;
  nome: string;
  descricao?: string;
}

const Kanban = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [funis, setFunis] = useState<Funil[]>([]);
  const [selectedFunil, setSelectedFunil] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [novoFunilNome, setNovoFunilNome] = useState("");
  const [dialogNovoFunil, setDialogNovoFunil] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      const { data: funisData } = await supabase.from("funis").select("*").order("criado_em");
      setFunis(funisData || []);
      
      if (!selectedFunil && funisData && funisData.length > 0) {
        setSelectedFunil(funisData[0].id);
      }

      const { data: etapasData } = await supabase.from("etapas").select("*").order("posicao");
      setEtapas(etapasData || []);

      const { data: leadsData } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      setLeads((leadsData || []).map(lead => ({ ...lead, nome: lead.name || "", name: lead.name || "" })));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do funil");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newEtapaId = over.id as string;

    setLeads((leads) => leads.map((lead) => lead.id === leadId ? { ...lead, etapa_id: newEtapaId } : lead));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return toast.error("Não autenticado");

      await supabase.functions.invoke("api-funil-vendas", {
        body: { action: "mover_lead", data: { lead_id: leadId, nova_etapa_id: newEtapaId } }
      });

      toast.success("Lead movido!");
    } catch (error) {
      toast.error("Erro ao mover lead");
      carregarDados();
    }
  };

  const criarNovoFunil = async () => {
    if (!novoFunilNome.trim()) return;

    try {
      await supabase.functions.invoke("api-funil-vendas", {
        body: { action: "criar_funil", data: { nome: novoFunilNome } }
      });

      toast.success("Funil criado!");
      setNovoFunilNome("");
      setDialogNovoFunil(false);
      carregarDados();
    } catch (error) {
      toast.error("Erro ao criar funil");
    }
  };

  const etapasFiltradas = etapas.filter((etapa) => etapa.funil_id === selectedFunil);

  if (loading) return <div className="flex items-center justify-center h-screen"><p>Carregando...</p></div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Funil de Vendas</h1>
          <p className="text-muted-foreground">Gerencie seus leads</p>
        </div>
        <Dialog open={dialogNovoFunil} onOpenChange={setDialogNovoFunil}>
          <DialogTrigger asChild>
            <Button variant="outline"><Plus className="mr-2 h-4 w-4" />Novo Funil</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Novo Funil</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome do Funil</Label><Input value={novoFunilNome} onChange={(e) => setNovoFunilNome(e.target.value)} /></div>
              <Button onClick={criarNovoFunil} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {funis.length > 0 && (
        <div className="mb-6">
          <Label>Funil</Label>
          <select value={selectedFunil} onChange={(e) => setSelectedFunil(e.target.value)} className="w-full max-w-xs p-2 border rounded-md mt-2">
            {funis.map((funil) => <option key={funil.id} value={funil.id}>{funil.nome}</option>)}
          </select>
        </div>
      )}

      {funis.length === 0 ? (
        <div className="text-center py-12">
          <Button onClick={() => setDialogNovoFunil(true)}><Plus className="mr-2" />Criar Primeiro Funil</Button>
        </div>
      ) : (
        <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {etapasFiltradas.map((etapa) => (
              <div key={etapa.id}>
                <div className="text-white p-3 rounded-t-lg" style={{ backgroundColor: etapa.cor }}>
                  <h3 className="font-semibold">{etapa.nome}</h3>
                  <span className="text-sm">{leads.filter(l => l.etapa_id === etapa.id).length} leads</span>
                </div>
                <SortableContext id={etapa.id} items={leads.filter(l => l.etapa_id === etapa.id)} strategy={verticalListSortingStrategy}>
                  <div className="bg-secondary/20 p-4 rounded-b-lg min-h-[500px]">
                    <NovoLeadDialog etapaId={etapa.id} funilId={selectedFunil} onLeadCreated={carregarDados} />
                    {leads.filter(l => l.etapa_id === etapa.id).map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onDelete={async (id) => {
                        await supabase.functions.invoke("api-funil-vendas", { body: { action: "deletar_lead", data: { lead_id: id } } });
                        carregarDados();
                      }} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
};

export default Kanban;