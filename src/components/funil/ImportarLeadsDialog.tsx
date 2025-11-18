import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, AlertCircle, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { safeFormatPhoneNumber } from "@/utils/phoneFormatter";

interface ImportarLeadsDialogProps {
  onLeadsImported: () => void;
}

export function ImportarLeadsDialog({ onLeadsImported }: ImportarLeadsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importTags, setImportTags] = useState<string>("");
  const [importReport, setImportReport] = useState<{
    total: number;
    success: number;
    errors: { line: number; errors: string[] }[];
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const fileName = selectedFile.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isTXT = fileName.endsWith('.txt');
    const isXLSX = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isTXT && !isXLSX) {
      toast.error("Formato não suportado. Use CSV, TXT ou XLSX");
      return;
    }

    setFile(selectedFile);
    setImportReport(null); // Reset report when new file is selected
    processFile(selectedFile);
  };

  const parseCSVLine = (line: string, separator: string = ','): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
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
    const fileName = file.name.toLowerCase();
    const isXLSX = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    
    if (isXLSX) {
      toast.error("Suporte a Excel (XLSX) será implementado em breve. Use CSV ou TXT por enquanto.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      
      // Para TXT, tentar detectar separador (vírgula, ponto e vírgula, ou tab)
      const separator = text.includes('\t') ? '\t' : (text.includes(';') ? ';' : ',');
      
      // Se for TXT sem separador claro, usar quebra de linha como separador de colunas
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast.error("Arquivo vazio ou inválido");
        return;
      }

      // Para TXT simples (uma coluna por linha), criar estrutura básica
      let headers: string[] = [];
      if (separator === '\t' || text.includes(',') || text.includes(';')) {
        headers = parseCSVLine(lines[0], separator).map(h => h.toLowerCase().trim());
      } else {
        // TXT simples - assumir que cada linha é um telefone ou nome+telefone
        headers = ['telefone'];
        if (lines[0].includes(' ')) {
          headers = ['nome', 'telefone'];
        }
      }

      const previewData = lines.slice(1, 6).map(line => {
        let values: string[];
        if (separator === '\t' || text.includes(',') || text.includes(';')) {
          values = parseCSVLine(line, separator);
        } else {
          // TXT simples - separar por espaço
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            values = [parts.slice(0, -1).join(' '), parts[parts.length - 1]];
          } else {
            values = [parts[0] || ''];
          }
        }
        
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });

      setPreview(previewData);
      setImportReport(null); // Reset report when new file is selected
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Funções de validação robustas
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): { isValid: boolean; formatted?: string } => {
    if (!phone || !phone.trim()) {
      return { isValid: false };
    }

    const formatted = safeFormatPhoneNumber(phone.trim());
    
    if (!formatted || formatted.length < 12) {
      return { isValid: false };
    }

    return { isValid: true, formatted };
  };

  const validateValue = (value: string): { isValid: boolean; parsed?: number } => {
    const cleaned = value.replace(/[^0-9,.-]+/g, "").replace(',', '.');
    const parsed = parseFloat(cleaned);

    if (isNaN(parsed) || parsed < 0) {
      return { isValid: false };
    }

    return { isValid: true, parsed };
  };

  const validateLead = (lead: any, lineNumber: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Validação obrigatória: TELEFONE (campo mais importante para WhatsApp)
    if (!lead.telefone || !lead.telefone.trim()) {
      errors.push("Telefone é obrigatório (necessário para WhatsApp)");
    } else {
      const phoneValidation = validatePhone(lead.telefone.trim());
      if (!phoneValidation.isValid) {
        errors.push(`Telefone inválido: "${lead.telefone}". Formatos aceitos: 10 dígitos (1123892019) ou 11 dígitos (61999523405)`);
      } else {
        lead.telefone = phoneValidation.formatted;
        lead.phone = phoneValidation.formatted;
      }
    }

    // Nome é opcional - se não tiver, usar telefone como nome
    if (!lead.name || lead.name.trim().length === 0) {
      lead.name = lead.telefone || `Contato ${lineNumber}`;
    }

    // Validação de email se fornecido
    if (lead.email && lead.email.trim()) {
      if (!validateEmail(lead.email.trim())) {
        errors.push("Email inválido");
      }
    }

    // Validação de valor se fornecido
    if (lead.value !== undefined && lead.value !== null && lead.value !== '') {
      const valueValidation = validateValue(String(lead.value));
      if (!valueValidation.isValid) {
        errors.push("Valor inválido (deve ser um número positivo)");
      } else {
        lead.value = valueValidation.parsed;
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecione um arquivo primeiro");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("❌ Usuário não autenticado. Faça login e tente novamente.");
        setLoading(false);
        return;
      }

      // Buscar company_id do usuário com tratamento de erro explícito
      const { data: userRole, error: roleError } = await supabase
        .from("user_roles")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        toast.error("❌ Não foi possível verificar sua empresa. Tente novamente ou contate o suporte.");
        setLoading(false);
        return;
      }

      if (!userRole?.company_id) {
        toast.error("⚠️ Sua conta não está vinculada a uma empresa. Solicite configuração ao administrador.");
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

      // Buscar todos os usuários da empresa para validar responsáveis
      const { data: companyUsers } = await supabase
        .from("user_roles")
        .select("user_id, profiles(email)")
        .eq("company_id", userRole.company_id);

      const userEmailMap = new Map<string, string>();
      companyUsers?.forEach(ur => {
        const email = (ur.profiles as any)?.email;
        if (email) {
          userEmailMap.set(email.toLowerCase(), ur.user_id);
        }
      });

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        
        // Detectar separador
        const separator = text.includes('\t') ? '\t' : (text.includes(';') ? ';' : ',');
        const lines = text.split('\n').filter(line => line.trim());
        
        let headers: string[] = [];
        if (separator === '\t' || text.includes(',') || text.includes(';')) {
          headers = parseCSVLine(lines[0], separator).map(h => h.trim().toLowerCase());
        } else {
          // TXT simples
          headers = ['telefone'];
          if (lines[0].includes(' ')) {
            headers = ['nome', 'telefone'];
          }
        }

        // Processar tags da interface
        const tagsArray = importTags
          ? importTags.split(/[,;]/).map(t => t.trim()).filter(t => t)
          : [];

        const processedLeads = lines.slice(1)
          .map((line, index) => {
            let values: string[];
            if (separator === '\t' || text.includes(',') || text.includes(';')) {
              values = parseCSVLine(line, separator);
            } else {
              // TXT simples
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 2) {
                values = [parts.slice(0, -1).join(' '), parts[parts.length - 1]];
              } else {
                values = [parts[0] || ''];
              }
            }
            
            const lead: any = {
              owner_id: user.id,
              company_id: userRole.company_id,
              funil_id: funilId,
              etapa_id: etapaId,
              status: 'novo',
              stage: 'prospeccao',
              value: 0,
              tags: tagsArray.length > 0 ? [...tagsArray] : [],
            };

            headers.forEach((header, colIndex) => {
              const value = values[colIndex]?.trim().replace(/^["']|["']$/g, '');
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
                  lead.telefone = value; // Será validado depois
                  break;
                case 'email':
                case 'e-mail':
                  lead.email = value.toLowerCase();
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
                  lead.value = value; // Será validado depois
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
                  const csvTagsArray = value.includes(';')
                    ? value.split(';')
                    : value.includes(',')
                    ? value.split(',')
                    : [value];
                  const csvTags = csvTagsArray.map((t: string) => t.trim()).filter((t: string) => t);
                  // Combinar tags do CSV com tags da interface
                  lead.tags = [...new Set([...tagsArray, ...csvTags])];
                  break;
                case 'observacoes':
                case 'notes':
                case 'nota':
                case 'observacao':
                  lead.notes = value;
                  break;
                case 'responsavel':
                case 'responsible':
                case 'atribuido':
                case 'assignee':
                  // Mapear email para user_id
                  const responsavelEmail = value.toLowerCase().trim();
                  const responsavelId = userEmailMap.get(responsavelEmail);
                  if (responsavelId) {
                    lead.responsavel_id = responsavelId;
                  }
                  break;
              }
            });

            return { lead, lineNumber: index + 2 }; // +2 porque começa na linha 1 (headers) + 1 para index 0
          });

        // Validar todos os leads e separar válidos dos inválidos
        const validationResults = processedLeads.map(({ lead, lineNumber }) => ({
          lead,
          lineNumber,
          validation: validateLead(lead, lineNumber)
        }));

        const validLeads = validationResults
          .filter(result => result.validation.isValid)
          .map(result => result.lead);

        const errors = validationResults
          .filter(result => !result.validation.isValid)
          .map(result => ({
            line: result.lineNumber,
            errors: result.validation.errors
          }));

        // Criar relatório de importação
        const report = {
          total: processedLeads.length,
          success: validLeads.length,
          errors
        };

        setImportReport(report);

        if (validLeads.length === 0) {
          toast.error("Nenhum lead válido encontrado no arquivo. Verifique os erros abaixo.");
          return;
        }

        // Remover duplicatas por telefone antes de importar
        const uniqueLeads = validLeads.reduce((acc: any[], lead: any) => {
          const telefoneNormalizado = (lead.telefone || lead.phone || '').replace(/\D/g, '');
          const exists = acc.find((l: any) => {
            const existingPhone = (l.telefone || l.phone || '').replace(/\D/g, '');
            return existingPhone === telefoneNormalizado;
          });
          if (!exists && telefoneNormalizado) {
            acc.push(lead);
          }
          return acc;
        }, []);

        if (uniqueLeads.length < validLeads.length) {
          const duplicatesCount = validLeads.length - uniqueLeads.length;
          console.warn(`⚠️ ${duplicatesCount} leads duplicados removidos antes da importação`);
        }

        // Importar apenas leads válidos e únicos
        // Validar estrutura dos dados antes de enviar
        const leadsToImport = uniqueLeads.map(lead => {
          // Garantir que todos os campos obrigatórios estão presentes
          const leadToInsert: any = {
            name: lead.name || lead.telefone || 'Contato sem nome',
            telefone: lead.telefone || lead.phone || '',
            phone: lead.telefone || lead.phone || '',
            owner_id: lead.owner_id,
            company_id: lead.company_id,
            funil_id: lead.funil_id,
            etapa_id: lead.etapa_id,
            status: lead.status || 'novo',
            stage: lead.stage || 'prospeccao',
            value: lead.value || 0,
          };

          // Campos opcionais
          if (lead.email) leadToInsert.email = lead.email;
          if (lead.cpf) leadToInsert.cpf = lead.cpf;
          if (lead.company) leadToInsert.company = lead.company;
          if (lead.source) leadToInsert.source = lead.source;
          if (lead.notes) leadToInsert.notes = lead.notes;
          if (lead.servico) leadToInsert.servico = lead.servico;
          if (lead.segmentacao) leadToInsert.segmentacao = lead.segmentacao;
          if (lead.responsavel_id) leadToInsert.responsavel_id = lead.responsavel_id;
          if (lead.tags && Array.isArray(lead.tags) && lead.tags.length > 0) {
            leadToInsert.tags = lead.tags;
          }

          return leadToInsert;
        });

        console.log(`📥 Importando ${leadsToImport.length} leads únicos...`);
        console.log(`📋 Exemplo de lead:`, leadsToImport[0]);

        // Importar em lotes de 50 para evitar problemas
        const BATCH_SIZE = 50;
        let totalImported = 0;
        let totalErrors = 0;
        const batchErrors: string[] = [];

        for (let i = 0; i < leadsToImport.length; i += BATCH_SIZE) {
          const batch = leadsToImport.slice(i, i + BATCH_SIZE);
          console.log(`📦 Processando lote ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} leads)...`);

          try {
            // Tentar insert primeiro (mais simples e compatível)
            const { data: insertedData, error: insertError } = await supabase
              .from("leads")
              .insert(batch)
              .select();

            if (insertError) {
              console.warn(`⚠️ Erro no insert do lote ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError);
              console.warn(`Código do erro:`, insertError.code);
              console.warn(`Mensagem:`, insertError.message);
              
              // Se for erro de duplicata, tentar upsert
              if (insertError.code === '23505' || 
                  insertError.message?.includes('duplicate') || 
                  insertError.message?.includes('unique') ||
                  insertError.message?.includes('violates unique constraint')) {
                console.log(`🔄 Tentando upsert para o lote ${Math.floor(i / BATCH_SIZE) + 1}...`);
                
                const { data: upsertedData, error: upsertError } = await supabase
                  .from("leads")
                  .upsert(batch, {
                    onConflict: 'telefone,company_id',
                    ignoreDuplicates: false
                  })
                  .select();

                if (upsertError) {
                  console.error(`❌ Erro no upsert do lote ${Math.floor(i / BATCH_SIZE) + 1}:`, upsertError);
                  batchErrors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertError.message}`);
                  totalErrors += batch.length;
                } else {
                  totalImported += upsertedData?.length || batch.length;
                  console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1} importado com sucesso (upsert)`);
                }
              } else {
                // Outro tipo de erro
                console.error(`❌ Erro no insert do lote ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError);
                batchErrors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`);
                totalErrors += batch.length;
              }
            } else {
              totalImported += insertedData?.length || batch.length;
              console.log(`✅ Lote ${Math.floor(i / BATCH_SIZE) + 1} importado com sucesso (insert)`);
            }
          } catch (batchError: any) {
            console.error(`❌ Erro inesperado no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError);
            batchErrors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message || 'Erro desconhecido'}`);
            totalErrors += batch.length;
          }
        }

        // Mostrar resultado final da importação
        const duplicatesRemoved = validLeads.length - uniqueLeads.length;
        
        if (totalErrors > 0) {
          console.error(`❌ Total de erros: ${totalErrors} leads não foram importados`);
          console.error(`Erros por lote:`, batchErrors);
          let message = `${totalImported} leads importados`;
          if (duplicatesRemoved > 0) {
            message += `. ${duplicatesRemoved} duplicados removidos`;
          }
          message += `. ${totalErrors} leads falharam. Verifique o console para detalhes.`;
          toast.warning(message);
        } else {
          let message = `${totalImported} leads importados com sucesso!`;
          if (duplicatesRemoved > 0) {
            message += ` (${duplicatesRemoved} duplicados removidos)`;
          }
          if (errors.length > 0) {
            message += `. ${errors.length} linhas com erros foram ignoradas`;
          }
          toast.success(message);
        }

        setOpen(false);
        setFile(null);
        setPreview([]);
        setImportTags("");
        onLeadsImported();
      };

      reader.readAsText(file);
    } catch (error: any) {
      console.error("❌ Erro completo na importação:", error);
      const errorMessage = error?.message || error?.toString() || "Erro desconhecido ao importar leads";
      toast.error(`Erro ao importar: ${errorMessage}`);
      
      // Mostrar detalhes do erro no console para debug
      if (error?.details) {
        console.error("Detalhes do erro:", error.details);
      }
      if (error?.hint) {
        console.error("Dica do erro:", error.hint);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        setFile(null);
        setPreview([]);
        setImportReport(null);
        setImportTags("");
      }
    }}>
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
              <strong>Formatos aceitos:</strong> CSV, TXT
              <br />
              <strong>Obrigatório:</strong> Telefone/WhatsApp (campo mais importante)
              <br />
              <strong>Opcionais:</strong> nome, email, cpf, empresa, origem, valor, status, servico, segmentacao, tags, observacoes, responsavel
              <br />
              <strong>Formatos de telefone aceitos:</strong>
              <br />
              • 10 dígitos: 1123892019, 1132747400, 2140090200 (será adicionado 9 automaticamente)
              <br />
              • 11 dígitos: 61999523405, 41999999999, 62998503845 (já completo)
              <br />
              • Com formatação: (11) 2389-2019, 11 2389-2019, 11-2389-2019
              <br />
              • Se o nome não for fornecido, será usado o telefone como identificação
              <br />
              • Tags adicionadas aqui serão aplicadas a todos os leads importados
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="file">Arquivo (CSV, TXT)</Label>
            <Input
              id="file"
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">
              <Tag className="inline h-4 w-4 mr-1" />
              Tags para segmentação (opcional)
            </Label>
            <Input
              id="tags"
              placeholder="Ex: cliente-vip, importado-2024, campanha-natal (separe com vírgula ou ponto e vírgula)"
              value={importTags}
              onChange={(e) => setImportTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Estas tags serão aplicadas a todos os leads importados deste arquivo
            </p>
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

          {importReport && (
            <div className="space-y-2">
              <Label>Relatório de Importação</Label>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{importReport.total}</div>
                    <div className="text-sm text-blue-800">Total de linhas</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importReport.success}</div>
                    <div className="text-sm text-green-800">Importados</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importReport.errors.length}</div>
                    <div className="text-sm text-red-800">Com erros</div>
                  </div>
                </div>

                {importReport.errors.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-red-600">Linhas com erros:</Label>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importReport.errors.map((error, index) => (
                        <div key={index} className="bg-red-50 p-2 rounded border-l-4 border-red-400">
                          <div className="font-medium text-red-800">Linha {error.line}:</div>
                          <ul className="text-sm text-red-700 ml-4">
                            {error.errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
