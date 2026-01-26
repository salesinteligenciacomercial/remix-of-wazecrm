import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Search,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { CompanySubscription, BillingPlan } from '@/hooks/useFinanceiro';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrialManagerProps {
  subscriptions: CompanySubscription[];
  plans: BillingPlan[];
  loading?: boolean;
  onConvertTrial: (subscriptionId: string, data: { 
    status: string; 
    monthly_value: number;
    billing_plan_id?: string;
    converted_from_trial: boolean;
  }) => Promise<boolean>;
  onExtendTrial: (subscriptionId: string, newEndDate: string) => Promise<boolean>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function TrialManager({ 
  subscriptions, 
  plans,
  loading, 
  onConvertTrial,
  onExtendTrial
}: TrialManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [convertDialog, setConvertDialog] = useState<CompanySubscription | null>(null);
  const [extendDialog, setExtendDialog] = useState<CompanySubscription | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [customValue, setCustomValue] = useState<string>('');
  const [extendDays, setExtendDays] = useState<string>('7');
  const [isConverting, setIsConverting] = useState(false);
  const [isExtending, setIsExtending] = useState(false);

  // Filter only trials
  const trialSubscriptions = subscriptions.filter(s => s.status === 'trial');
  
  // Apply search filter
  const filteredTrials = trialSubscriptions.filter(s => 
    s.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.billing_plan?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate trial stats
  const stats = {
    total: trialSubscriptions.length,
    expiringSoon: trialSubscriptions.filter(s => {
      const daysLeft = getDaysRemaining(s);
      return daysLeft !== null && daysLeft <= 3 && daysLeft > 0;
    }).length,
    expired: trialSubscriptions.filter(s => {
      const daysLeft = getDaysRemaining(s);
      return daysLeft !== null && daysLeft <= 0;
    }).length
  };

  function getDaysRemaining(subscription: CompanySubscription): number | null {
    if (!subscription.trial_end_date) {
      // Se não tem trial_end_date, calcular baseado em trial_days e start_date
      const trialDays = subscription.trial_days || 14;
      const startDate = new Date(subscription.start_date);
      const endDate = addDays(startDate, trialDays);
      return differenceInDays(endDate, new Date());
    }
    return differenceInDays(new Date(subscription.trial_end_date), new Date());
  }

  function getTrialBadge(subscription: CompanySubscription) {
    const daysLeft = getDaysRemaining(subscription);
    
    if (daysLeft === null) {
      return <Badge variant="secondary">Trial</Badge>;
    }
    
    if (daysLeft <= 0) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    
    if (daysLeft <= 3) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {daysLeft} dia{daysLeft !== 1 ? 's' : ''}
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="border-blue-500 text-blue-600">
        <Clock className="h-3 w-3 mr-1" />
        {daysLeft} dias
      </Badge>
    );
  }

  async function handleConvert() {
    if (!convertDialog) return;
    
    setIsConverting(true);
    try {
      const plan = plans.find(p => p.id === selectedPlan);
      const value = selectedPlan === 'custom' 
        ? parseFloat(customValue.replace(/\./g, '').replace(',', '.')) || 0
        : plan?.monthly_price || 0;

      const success = await onConvertTrial(convertDialog.id, {
        status: 'active',
        monthly_value: value,
        billing_plan_id: selectedPlan !== 'custom' ? selectedPlan : undefined,
        converted_from_trial: true
      });

      if (success) {
        setConvertDialog(null);
        setSelectedPlan('');
        setCustomValue('');
      }
    } finally {
      setIsConverting(false);
    }
  }

  async function handleExtend() {
    if (!extendDialog) return;
    
    setIsExtending(true);
    try {
      const currentEnd = extendDialog.trial_end_date 
        ? new Date(extendDialog.trial_end_date)
        : addDays(new Date(extendDialog.start_date), extendDialog.trial_days || 14);
      
      const newEnd = addDays(currentEnd, parseInt(extendDays));
      const success = await onExtendTrial(extendDialog.id, format(newEnd, 'yyyy-MM-dd'));

      if (success) {
        setExtendDialog(null);
        setExtendDays('7');
      }
    } finally {
      setIsExtending(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Gestão de Trials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Gestão de Trials
              </CardTitle>
              <CardDescription>
                Acompanhe e converta clientes em período de teste
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-sm">
                {stats.total} trial{stats.total !== 1 ? 's' : ''} ativo{stats.total !== 1 ? 's' : ''}
              </Badge>
              {stats.expiringSoon > 0 && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 text-sm">
                  {stats.expiringSoon} expirando
                </Badge>
              )}
              {stats.expired > 0 && (
                <Badge variant="destructive" className="text-sm">
                  {stats.expired} expirado{stats.expired !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa ou plano..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredTrials.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum trial encontrado para a busca' : 'Nenhum trial ativo no momento'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Trial Restante</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrials.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell className="font-medium">
                        {subscription.company?.name || 'Empresa não encontrada'}
                      </TableCell>
                      <TableCell>
                        {subscription.billing_plan?.name || 'Personalizado'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(subscription.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {getTrialBadge(subscription)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExtendDialog(subscription)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Estender
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setConvertDialog(subscription);
                              if (subscription.billing_plan_id) {
                                setSelectedPlan(subscription.billing_plan_id);
                              }
                            }}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            Converter
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Convert Dialog */}
      <Dialog open={!!convertDialog} onOpenChange={() => setConvertDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Converter Trial para Pago
            </DialogTitle>
            <DialogDescription>
              Converter {convertDialog?.company?.name} para uma assinatura ativa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Plano</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.is_active).map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.monthly_price)}/mês
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Valor Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPlan === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Mensal (R$)</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={customValue}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,]/g, '');
                    setCustomValue(value);
                  }}
                />
              </div>
            )}

            {selectedPlan && selectedPlan !== 'custom' && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Valor mensal: <span className="font-semibold text-foreground">
                    {formatCurrency(plans.find(p => p.id === selectedPlan)?.monthly_price || 0)}
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialog(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConvert} 
              disabled={!selectedPlan || isConverting}
            >
              {isConverting ? 'Convertendo...' : 'Confirmar Conversão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={!!extendDialog} onOpenChange={() => setExtendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Estender Período de Trial
            </DialogTitle>
            <DialogDescription>
              Adicionar mais dias ao trial de {extendDialog?.company?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dias para adicionar</label>
              <Select value={extendDays} onValueChange={setExtendDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {extendDialog && (
              <div className="bg-muted p-4 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  Nova data de término:{' '}
                  <span className="font-semibold text-foreground">
                    {format(
                      addDays(
                        extendDialog.trial_end_date 
                          ? new Date(extendDialog.trial_end_date)
                          : addDays(new Date(extendDialog.start_date), extendDialog.trial_days || 14),
                        parseInt(extendDays)
                      ),
                      'dd/MM/yyyy',
                      { locale: ptBR }
                    )}
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleExtend} disabled={isExtending}>
              {isExtending ? 'Estendendo...' : 'Confirmar Extensão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
