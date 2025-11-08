// ============================================================================
// QUEUE SERVICE
// Service to interact with sync_queue table for Level 2 architecture
// ============================================================================

import { supabase } from '@/lib/supabase'

export interface SyncJob {
  id: string
  store_id: string
  period_start: string
  period_end: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  priority: number
  retry_count: number
  max_retries: number
  error_message?: string
  last_error_at?: string
  meta?: any
  queued_at: string
  started_at?: string
  completed_at?: string
}

export interface QueueJobResult {
  success: boolean
  job_id?: string
  job?: SyncJob
  error?: string
}

export class QueueService {
  /**
   * Add a sync job to the queue
   * @param storeId - UUID of the store
   * @param periodStart - Start date (YYYY-MM-DD)
   * @param periodEnd - End date (YYYY-MM-DD)
   * @param priority - Priority 1-10 (1 = highest, default 5)
   * @returns Job ID or error
   */
  static async addToQueue(
    storeId: string,
    periodStart: string,
    periodEnd: string,
    priority: number = 5
  ): Promise<QueueJobResult> {
    try {
      console.log('[QueueService] Adding job to queue:', {
        storeId,
        periodStart,
        periodEnd,
        priority
      })

      // Check if job already exists for this store/period/status
      const { data: existingJobs, error: checkError } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('store_id', storeId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .in('status', ['queued', 'processing'])

      if (checkError) {
        console.error('[QueueService] Error checking existing jobs:', checkError)
        throw checkError
      }

      // If job already exists and is queued or processing, return it
      if (existingJobs && existingJobs.length > 0) {
        const existingJob = existingJobs[0]
        console.log('[QueueService] Job already exists:', existingJob.id, 'Status:', existingJob.status)
        return {
          success: true,
          job_id: existingJob.id,
          job: existingJob
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Insert new job
      const { data: newJob, error: insertError } = await supabase
        .from('sync_queue')
        .insert({
          store_id: storeId,
          period_start: periodStart,
          period_end: periodEnd,
          priority,
          status: 'queued',
          triggered_by: user?.id,
          meta: {
            triggered_from: 'frontend',
            user_agent: navigator.userAgent
          }
        })
        .select()
        .single()

      if (insertError) {
        console.error('[QueueService] Error inserting job:', insertError)
        throw insertError
      }

      console.log('[QueueService] ✓ Job added to queue:', newJob.id)

      return {
        success: true,
        job_id: newJob.id,
        job: newJob
      }

    } catch (error: any) {
      console.error('[QueueService] Failed to add job to queue:', error)
      return {
        success: false,
        error: error.message || 'Failed to add job to queue'
      }
    }
  }

  /**
   * Get status of a specific job
   * @param jobId - UUID of the job
   * @returns Job data or error
   */
  static async getJobStatus(jobId: string): Promise<QueueJobResult> {
    try {
      const { data: job, error } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) {
        console.error('[QueueService] Error fetching job status:', error)
        throw error
      }

      return {
        success: true,
        job
      }

    } catch (error: any) {
      console.error('[QueueService] Failed to get job status:', error)
      return {
        success: false,
        error: error.message || 'Failed to get job status'
      }
    }
  }

  /**
   * Get all jobs for a specific store
   * @param storeId - UUID of the store
   * @param limit - Maximum number of jobs to return (default 50)
   * @returns Array of jobs or error
   */
  static async getStoreJobs(
    storeId: string,
    limit: number = 50
  ): Promise<{ success: boolean; jobs?: SyncJob[]; error?: string }> {
    try {
      const { data: jobs, error } = await supabase
        .from('sync_queue')
        .select('*')
        .eq('store_id', storeId)
        .order('queued_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[QueueService] Error fetching store jobs:', error)
        throw error
      }

      return {
        success: true,
        jobs: jobs || []
      }

    } catch (error: any) {
      console.error('[QueueService] Failed to get store jobs:', error)
      return {
        success: false,
        error: error.message || 'Failed to get store jobs'
      }
    }
  }

  /**
   * Poll a job until it completes (or fails)
   * @param jobId - UUID of the job
   * @param onProgress - Callback for progress updates
   * @param pollInterval - Interval in ms (default 2000)
   * @param maxPolls - Maximum number of polls (default 150 = 5 minutes at 2s interval)
   * @returns Final job result
   */
  static async pollJobUntilComplete(
    jobId: string,
    onProgress?: (job: SyncJob) => void,
    pollInterval: number = 2000,
    maxPolls: number = 150
  ): Promise<QueueJobResult> {
    let pollCount = 0

    return new Promise((resolve) => {
      const poll = async () => {
        pollCount++

        const result = await this.getJobStatus(jobId)

        if (!result.success || !result.job) {
          resolve(result)
          return
        }

        const job = result.job

        // Call progress callback
        if (onProgress) {
          onProgress(job)
        }

        // Check if job is complete
        if (job.status === 'completed') {
          console.log('[QueueService] ✓ Job completed:', jobId)
          resolve(result)
          return
        }

        if (job.status === 'failed') {
          console.error('[QueueService] ✗ Job failed:', jobId, job.error_message)
          resolve({
            success: false,
            job,
            error: job.error_message || 'Job failed'
          })
          return
        }

        // Check if max polls reached
        if (pollCount >= maxPolls) {
          console.warn('[QueueService] Max polls reached, job still not complete:', jobId)
          resolve({
            success: false,
            job,
            error: 'Timeout waiting for job completion'
          })
          return
        }

        // Continue polling
        setTimeout(poll, pollInterval)
      }

      // Start polling
      poll()
    })
  }

  /**
   * Get queue statistics
   * @returns Queue stats or error
   */
  static async getQueueStats(): Promise<{
    success: boolean
    stats?: Array<{
      status: string
      job_count: number
      avg_duration_seconds?: number
      max_duration_seconds?: number
      oldest_job_at?: string
    }>
    error?: string
  }> {
    try {
      const { data: stats, error } = await supabase
        .from('v_sync_queue_stats')
        .select('*')

      if (error) {
        console.error('[QueueService] Error fetching queue stats:', error)
        throw error
      }

      return {
        success: true,
        stats: stats || []
      }

    } catch (error: any) {
      console.error('[QueueService] Failed to get queue stats:', error)
      return {
        success: false,
        error: error.message || 'Failed to get queue stats'
      }
    }
  }

  /**
   * Subscribe to real-time job updates
   * @param jobId - UUID of the job
   * @param onUpdate - Callback for updates
   * @returns Unsubscribe function
   */
  static subscribeToJob(
    jobId: string,
    onUpdate: (job: SyncJob) => void
  ): () => void {
    const channel = supabase
      .channel(`sync_queue:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_queue',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('[QueueService] Real-time update:', payload.new)
          onUpdate(payload.new as SyncJob)
        }
      )
      .subscribe()

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Check cache for existing data
   * @param storeId - UUID of the store
   * @param dataType - Type of data to check
   * @param periodStart - Start date (YYYY-MM-DD)
   * @param periodEnd - End date (YYYY-MM-DD)
   * @returns Cached data or null
   */
  static async checkCache(
    storeId: string,
    dataType: 'analytics' | 'orders' | 'campaigns' | 'flows' | 'customers' | 'products',
    periodStart: string,
    periodEnd: string
  ): Promise<{ success: boolean; data?: any; cached?: boolean; error?: string }> {
    try {
      const { data: cached, error } = await supabase
        .from('store_sync_cache')
        .select('*')
        .eq('store_id', storeId)
        .eq('data_type', dataType)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .eq('sync_status', 'success')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('[QueueService] Error checking cache:', error)
        throw error
      }

      if (cached) {
        console.log('[QueueService] ✓ Cache hit for', dataType)
        return {
          success: true,
          data: cached.data,
          cached: true
        }
      }

      console.log('[QueueService] Cache miss for', dataType)
      return {
        success: true,
        cached: false
      }

    } catch (error: any) {
      console.error('[QueueService] Failed to check cache:', error)
      return {
        success: false,
        error: error.message || 'Failed to check cache'
      }
    }
  }
}
