import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  Clock,
  TrendingUp,
  Users,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface SDRMetrics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalDuration: number;
  conversionRate: number;
  userRankings: Record<string, number>;
}

interface UserInfo {
  id: string;
  name: string;
  calls: number;
}

interface SDRDashboardProps {
  getMetrics: () => Promise<SDRMetrics | null>;
}

export const SDRDashboard: React.FC<SDRDashboardProps> = ({ getMetrics }) => {
  const [metrics, setMetrics] = useState<SDRMetrics | null>(null);
  const [userRankings, setUserRankings] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMetrics = async () => {
    setIsLoading(true);
    const data = await getMetrics();
    setMetrics(data);

    // Fetch user names for rankings
    if (data?.userRankings) {
      const userIds = Object.keys(data.userRankings);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const rankings = userIds.map(userId => ({
          id: userId,
          name: profiles?.find(p => p.id === userId)?.full_name || 'Usuário',
          calls: data.userRankings[userId]
        })).sort((a, b) => b.calls - a.calls);

        setUserRankings(rankings);
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Painel SDR - Métricas de Hoje</h3>
        <Button variant="outline" size="sm" onClick={loadMetrics}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Ligações
            </CardTitle>
            <Phone className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalCalls || 0}</div>
            <p className="text-xs text-muted-foreground">ligações hoje</p>
          </CardContent>
        </Card>

        {/* Answered Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Atendidas
            </CardTitle>
            <PhoneIncoming className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {metrics?.answeredCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.conversionRate || 0}% de conversão
            </p>
          </CardContent>
        </Card>

        {/* Missed/Failed Calls */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Não Atendidas
            </CardTitle>
            <PhoneMissed className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {metrics?.missedCalls || 0}
            </div>
            <p className="text-xs text-muted-foreground">recusadas ou sem resposta</p>
          </CardContent>
        </Card>

        {/* Avg Duration */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio
            </CardTitle>
            <Clock className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatDuration(metrics?.avgDuration || 0)}
            </div>
            <p className="text-xs text-muted-foreground">por ligação</p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Taxa de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Atendidas</span>
              <span className="font-medium">{metrics?.conversionRate || 0}%</span>
            </div>
            <Progress value={metrics?.conversionRate || 0} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* User Rankings */}
      {userRankings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Ranking por Usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRankings.slice(0, 10).map((user, index) => (
                <div key={user.id} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-yellow-950' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-orange-400 text-orange-950' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {user.calls} ligações
                      </span>
                    </div>
                    <Progress 
                      value={(user.calls / userRankings[0].calls) * 100} 
                      className="h-1 mt-1" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
