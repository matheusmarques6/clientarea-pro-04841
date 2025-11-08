// ============================================================================
// QUEUE STATUS COMPONENT
// Shows the status of sync jobs in the queue
// ============================================================================

import { useEffect, useState } from 'react'
import { QueueService, type SyncJob } from '@/services/QueueService'
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface QueueStatusProps {
  storeId: string
  limit?: number
}

export function QueueStatus({ storeId, limit = 5 }: QueueStatusProps) {
  const [jobs, setJobs] = useState<SyncJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadJobs = async () => {
    setIsLoading(true)
    setError(null)

    const result = await QueueService.getStoreJobs(storeId, limit)

    if (result.success && result.jobs) {
      setJobs(result.jobs)
    } else {
      setError(result.error || 'Failed to load jobs')
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadJobs()

    // Refresh every 5 seconds
    const interval = setInterval(loadJobs, 5000)

    return () => clearInterval(interval)
  }, [storeId, limit])

  const getStatusIcon = (status: SyncJob['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusLabel = (status: SyncJob['status']) => {
    switch (status) {
      case 'queued':
        return 'Na fila'
      case 'processing':
        return 'Processando'
      case 'completed':
        return 'Concluído'
      case 'failed':
        return 'Falhou'
    }
  }

  const getStatusColor = (status: SyncJob['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatPeriod = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`
  }

  if (isLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Carregando status da fila...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg">
        Erro ao carregar status: {error}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center">
        Nenhuma sincronização recente
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-700 mb-3">
        Histórico de Sincronizações
      </div>

      {jobs.map((job) => (
        <div
          key={job.id}
          className={`p-3 rounded-lg border ${getStatusColor(job.status)} transition-all`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5">
                {getStatusIcon(job.status)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">
                    {getStatusLabel(job.status)}
                  </span>
                  {job.retry_count > 0 && (
                    <span className="text-xs text-gray-600">
                      (tentativa {job.retry_count + 1}/{job.max_retries + 1})
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-600 space-y-0.5">
                  <div>Período: {formatPeriod(job.period_start, job.period_end)}</div>
                  <div>Adicionado: {formatDate(job.queued_at)}</div>

                  {job.started_at && (
                    <div>Iniciado: {formatDate(job.started_at)}</div>
                  )}

                  {job.completed_at && (
                    <div>Concluído: {formatDate(job.completed_at)}</div>
                  )}

                  {job.error_message && (
                    <div className="text-red-600 mt-1">
                      Erro: {job.error_message}
                    </div>
                  )}

                  {job.meta?.processing_time_ms && (
                    <div className="text-green-600 mt-1">
                      Tempo: {(job.meta.processing_time_ms / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
