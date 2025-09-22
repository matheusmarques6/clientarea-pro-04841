import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface AuditEvent {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  details: any;
  admin_user_id: string | null;
  created_at: string;
}

const AdminAudit = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuditEvents();
  }, []);

  const fetchAuditEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching audit events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.entity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || event.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || event.entity === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('create')) return 'default';
    if (action.includes('update')) return 'secondary';
    if (action.includes('delete')) return 'destructive';
    return 'outline';
  };

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case 'client':
      case 'clients':
        return '🏢';
      case 'store':
      case 'stores':
        return '🏪';
      case 'user':
      case 'users':
        return '👤';
      default:
        return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const uniqueActions = [...new Set(events.map(e => e.action))];
  const uniqueEntities = [...new Set(events.map(e => e.entity))];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
          <div className="grid gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold heading-primary">Log de Auditoria</h1>
          <p className="text-muted-foreground">
            Histórico de ações administrativas
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueEntities.map(entity => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos de Auditoria ({filteredEvents.length})</CardTitle>
          <CardDescription>
            Últimos eventos registrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEvents.length > 0 ? (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                    {getEntityIcon(event.entity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getActionBadgeVariant(event.action)}>
                        {event.action}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.entity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {formatDate(event.created_at)}
                    </p>
                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {event.entity_id && (
                        <>ID: {event.entity_id}</>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum evento encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAudit;