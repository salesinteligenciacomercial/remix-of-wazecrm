import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Search, User, Hash } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  telefone: string | null;
  email: string | null;
}

interface StartCallFromLeadDialogProps {
  open: boolean;
  onClose: () => void;
  onStartCall: (leadId: string, leadName: string, phoneNumber: string) => void;
}

export const StartCallFromLeadDialog: React.FC<StartCallFromLeadDialogProps> = ({
  open,
  onClose,
  onStartCall
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualNumber, setManualNumber] = useState('');
  const [manualName, setManualName] = useState('');
  const [activeTab, setActiveTab] = useState('leads');

  useEffect(() => {
    if (open) {
      loadLeads();
      setManualNumber('');
      setManualName('');
      setActiveTab('leads');
    }
  }, [open]);

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (!userRole?.company_id) return;

      const { data, error } = await supabase
        .from('leads')
        .select('id, name, phone, telefone, email')
        .eq('company_id', userRole.company_id)
        .or('phone.neq.,telefone.neq.')
        .limit(100);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const term = searchTerm.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(term) ||
      lead.phone?.includes(term) ||
      lead.telefone?.includes(term) ||
      lead.email?.toLowerCase().includes(term)
    );
  });

  const handleSelectLead = (lead: Lead) => {
    const phoneNumber = lead.telefone || lead.phone || '';
    if (phoneNumber) {
      onStartCall(lead.id, lead.name, phoneNumber);
      onClose();
    }
  };

  const handleManualCall = () => {
    const cleanNumber = manualNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) return;
    onStartCall('', manualName || cleanNumber, manualNumber);
    onClose();
  };

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Fazer Ligação
          </DialogTitle>
          <DialogDescription>
            Selecione um lead ou digite um número para ligar
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Digitar Número
            </TabsTrigger>
          </TabsList>

          {/* Tab: Contatos do CRM */}
          <TabsContent value="leads" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {isLoading ? (
                  <div className="text-center text-muted-foreground py-8">
                    Carregando leads...
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'Nenhum lead encontrado' : 'Nenhum lead com telefone cadastrado'}
                  </div>
                ) : (
                  filteredLeads.map((lead) => {
                    const phone = lead.telefone || lead.phone;
                    return (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => handleSelectLead(lead)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-muted-foreground">{phone}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Phone className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab: Digitar Número */}
          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome (opcional)</label>
                <Input
                  placeholder="Nome do contato..."
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Número de telefone *</label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={manualNumber}
                  onChange={(e) => setManualNumber(formatPhoneInput(e.target.value))}
                  className="text-lg tracking-wider"
                />
                <p className="text-xs text-muted-foreground">
                  Digite o DDD + número com 10 ou 11 dígitos
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleManualCall}
                disabled={manualNumber.replace(/\D/g, '').length < 10}
              >
                <Phone className="w-4 h-4 mr-2" />
                Ligar para {manualName || manualNumber || 'número'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
