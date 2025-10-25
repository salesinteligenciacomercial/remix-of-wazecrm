import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportarLeadsDialogProps {
  onLeadsImported: () => void;
}

export function ImportarLeadsDialog({ onLeadsImported }: ImportarLeadsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error("Apenas arquivos CSV são suportados no momento");
      return;
    }

    setFile(selectedFile);
    processFile(selectedFile);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("Arquivo CSV vazio ou inválido");
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      
      const previewData = lines.slice(1, 6).map(line => {
        const values = parseCSVLine(line);
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });

      setPreview(previewData);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar company_id do usuário
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!userRole?.company_id) {
        toast.error("Empresa não encontrada");
        setLoading(false);
        return;
      }

      // Buscar primeiro funil do usuário
      const { data: funis } = await supabase
        .from("funis")
        .select("id")
        .eq("company_id", userRole.company_id)
        .limit(1);

      if (!funis || funis.length === 0) {
        toast.error("Crie um funil antes de importar leads");
        setLoading(false);
        return;
      }

      const funilId = funis[0].id;

      // Buscar primeira etapa do funil
      const { data: etapas } = await supabase
        .from("etapas")
        .select("id")
        .eq("funil_id", funilId)
        .order("posicao", { ascending: true })
        .limit(1);

      if (!etapas || etapas.length === 0) {
        toast.error("Crie etapas no funil antes de importar leads");
        setLoading(false);
        return;
      }

      const etapaId = etapas[0].id;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
        
        const leadsToImport = lines.slice(1)
          .map(line => {
            const values = parseCSVLine(line);
            const lead: any = {
              owner_id: user.id,
              company_id: userRole.company_id,
              funil_id: funilId,
              etapa_id: etapaId,
              status: 'novo',
              stage: 'prospeccao',
              value: 0,
            };

            headers.forEach((header, index) => {
              const value = values[index]?.trim().replace(/^["']|["']$/g, '');
              if (!value) return;

              // Mapear colunas do CSV para campos do banco
              switch (header) {
                case 'nome':
                case 'name':
                  lead.name = value;
                  break;
                case 'telefone':
                case 'phone':
                case 'whatsapp':
                case 'celular':
                  let telefone = value.replace(/\D/g, "");
                  if (!telefone.startsWith("55")) {
                    telefone = "55" + telefone;
                  }
                  lead.telefone = telefone;
                  lead.phone = telefone;
                  break;
                case 'email':
                case 'e-mail':
                  if (value.includes('@')) {
                    lead.email = value.toLowerCase();
                  }
                  break;
                case 'cpf':
                  lead.cpf = value.replace(/\D/g, "");
                  break;
                case 'empresa':
                case 'company':
                  lead.company = value;
                  break;
                case 'origem':
                case 'source':
                case 'fonte':
                  lead.source = value;
                  break;
                case 'valor':
                case 'value':
                case 'ticket':
                  const valorLimpo = value.replace(/[^0-9,.-]+/g, "").replace(',', '.');
                  lead.value = parseFloat(valorLimpo) || 0;
                  break;
                case 'status':
                  const statusValido = ['novo', 'em_contato', 'qualificado', 'negociacao', 'ganho', 'perdido'];
                  const statusNormalizado = value.toLowerCase().replace(/\s+/g, '_');
                  if (statusValido.includes(statusNormalizado)) {
                    lead.status = statusNormalizado;
                  }
                  break;
                case 'servico':
                case 'service':
                case 'produto':
                  lead.servico = value;
                  break;
                case 'segmentacao':
                case 'segmento':
                case 'categoria':
                  lead.segmentacao = value;
                  break;
                case 'tags':
                case 'tag':
                case 'etiquetas':
                  const tagsArray = value.includes(';') 
                    ? value.split(';') 
                    : value.includes(',') 
                    ? value.split(',') 
                    : [value];
                  lead.tags = tagsArray.map((t: string) => t.trim()).filter((t: string) => t);
                  break;
                case 'observacoes':
                case 'notes':
                case 'nota':
                case 'observacao':
                  lead.notes = value;
                  break;
              }
            });

            return lead;
          })
          .filter(lead => lead.name && lead.name.length > 0); // Só importar leads com nome válido

        if (leadsToImport.length === 0) {
          toast.error("Nenhum lead válido encontrado no arquivo");
          return;
        }

        const { error } = await supabase
          .from("leads")
          .insert(leadsToImport);

        if (error) throw error;

        toast.success(`${leadsToImport.length} leads importados com sucesso!`);
        setOpen(false);
        setFile(null);
        setPreview([]);
        onLeadsImported();
      };

      reader.readAsText(file);
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar leads");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Leads</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Formato do arquivo CSV:</strong>
              <br />
              <strong>Obrigatório:</strong> nome
              <br />
              <strong>Opcionais:</strong> telefone, email, cpf, empresa, origem, valor, status, servico, segmentacao, tags, observacoes
              <br />
              • Separe múltiplas tags com ponto e vírgula (;) ou vírgula (,)
              <br />
              • O telefone será formatado automaticamente com código do Brasil (+55)
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="file">Arquivo CSV</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <Label>Prévia (primeiras 5 linhas)</Label>
              <div className="border rounded-lg p-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {Object.keys(preview[0]).map((key) => (
                        <th key={key} className="text-left p-2 border-b">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((value: any, j) => (
                          <td key={j} className="p-2 border-b">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {loading ? "Importando..." : "Importar Leads"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
