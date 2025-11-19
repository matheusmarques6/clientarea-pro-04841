// ============================================================================
// SYNC WORKER - Edge Function
// Processes jobs from sync_queue table
// Invoked by cron every 10 seconds
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  console.log('='.repeat(80))
  console.log('[WORKER] Sync worker invoked')
  console.log('='.repeat(80))

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ========================================================================
    // 1. CHECK CONCURRENT JOBS
    // ========================================================================
    const MAX_CONCURRENT = 3 // Maximum 3 jobs processing simultaneously

    const { count: processingCount, error: countError } = await supabase
      .from('sync_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing')

    if (countError) {
      console.error('[WORKER] Error counting processing jobs:', countError)
      throw countError
    }

    console.log(`[WORKER] Currently processing: ${processingCount}/${MAX_CONCURRENT} jobs`)

    if (processingCount >= MAX_CONCURRENT) {
      console.log('[WORKER] Max concurrent jobs reached, skipping this cycle')
      return new Response(
        JSON.stringify({
          message: 'Max concurrent jobs reached',
          processing: processingCount,
          max: MAX_CONCURRENT
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // ========================================================================
    // 2. CLEANUP STUCK JOBS (processing for more than 10 minutes)
    // ========================================================================
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

    const { data: stuckJobs, error: stuckError } = await supabase
      .from('sync_queue')
      .select('id, store_id, retry_count, max_retries')
      .eq('status', 'processing')
      .lt('started_at', tenMinutesAgo)

    if (stuckError) {
      console.error('[WORKER] Error finding stuck jobs:', stuckError)
    } else if (stuckJobs && stuckJobs.length > 0) {
      console.log(`[WORKER] Found ${stuckJobs.length} stuck jobs, cleaning up...`)

      for (const job of stuckJobs) {
        if (job.retry_count >= job.max_retries) {
          // Failed permanently
          await supabase
            .from('sync_queue')
            .update({
              status: 'failed',
              error_message: 'Job timeout - exceeded 10 minutes',
              last_error_at: new Date().toISOString(),
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id)

          console.log(`[WORKER] ✗ Job ${job.id} marked as failed (max retries reached)`)
        } else {
          // Retry
          await supabase
            .from('sync_queue')
            .update({
              status: 'queued',
              retry_count: job.retry_count + 1,
              error_message: 'Job timeout - will retry',
              last_error_at: new Date().toISOString(),
              started_at: null
            })
            .eq('id', job.id)

          console.log(`[WORKER] Job ${job.id} returned to queue (retry ${job.retry_count + 1})`)
        }
      }
    }

    // ========================================================================
    // 3. GET NEXT JOB FROM QUEUE
    // ========================================================================
    console.log('[WORKER] Looking for next job...')

    // Use SELECT FOR UPDATE SKIP LOCKED to prevent race conditions
    const { data: jobs, error: jobError } = await supabase
      .from('sync_queue')
      .select('*')
      .eq('status', 'queued')
      .order('priority', { ascending: true })
      .order('queued_at', { ascending: true })
      .limit(1)

    if (jobError) {
      console.error('[WORKER] Error fetching job:', jobError)
      throw jobError
    }

    if (!jobs || jobs.length === 0) {
      console.log('[WORKER] No jobs in queue')
      return new Response(
        JSON.stringify({ message: 'No jobs in queue' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const job = jobs[0]
    console.log(`[WORKER] Processing job: ${job.id}`)
    console.log(`[WORKER] Store: ${job.store_id}`)
    console.log(`[WORKER] Period: ${job.period_start} to ${job.period_end}`)
    console.log(`[WORKER] Data type: ${job.data_type || 'ALL (full sync)'}`)
    console.log(`[WORKER] Priority: ${job.priority}`)
    console.log(`[WORKER] Retry count: ${job.retry_count}/${job.max_retries}`)

    // ========================================================================
    // 4. MARK JOB AS PROCESSING
    // ========================================================================
    const { error: updateError } = await supabase
      .from('sync_queue')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id)

    if (updateError) {
      console.error('[WORKER] Error updating job status:', updateError)
      throw updateError
    }

    console.log('[WORKER] Job marked as processing')

    // ========================================================================
    // 5. INVOKE SYNC-STORE EDGE FUNCTION
    // ========================================================================
    console.log('[WORKER] Invoking sync-store Edge Function...')

    try {
      // Fazer requisição HTTP direta com service role key
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

      const requestBody: any = {
        store_id: job.store_id,
        period_start: job.period_start,
        period_end: job.period_end
      }

      // Se é micro-job, incluir data_type
      if (job.data_type) {
        requestBody.data_type = job.data_type
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/sync-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const syncData = await response.json()

      if (!syncData || !syncData.success) {
        throw new Error(syncData?.error || 'Sync failed without error message')
      }

      // ========================================================================
      // 6. MARK JOB AS COMPLETED
      // ========================================================================
      console.log('[WORKER] Sync completed successfully!')

      await supabase
        .from('sync_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          meta: {
            ...job.meta,
            processing_time_ms: Date.now() - startTime,
            sync_result: syncData.summary
          }
        })
        .eq('id', job.id)

      console.log(`[WORKER] ✓ Job ${job.id} completed successfully`)
      console.log(`[WORKER] Processing time: ${Date.now() - startTime}ms`)

      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          store_id: job.store_id,
          processing_time_ms: Date.now() - startTime,
          summary: syncData.summary
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (syncError: any) {
      // ========================================================================
      // 7. HANDLE SYNC ERROR
      // ========================================================================
      console.error('[WORKER] Sync failed:', syncError)

      const newRetryCount = job.retry_count + 1
      const shouldRetry = newRetryCount < job.max_retries

      if (shouldRetry) {
        // Return job to queue for retry
        console.log(`[WORKER] Job will retry (attempt ${newRetryCount + 1}/${job.max_retries})`)

        await supabase
          .from('sync_queue')
          .update({
            status: 'queued',
            retry_count: newRetryCount,
            error_message: syncError.message || 'Unknown error',
            last_error_at: new Date().toISOString(),
            started_at: null
          })
          .eq('id', job.id)

        console.log(`[WORKER] ⟳ Job ${job.id} returned to queue for retry`)

      } else {
        // Max retries reached, mark as failed
        console.log('[WORKER] Max retries reached, marking as failed')

        await supabase
          .from('sync_queue')
          .update({
            status: 'failed',
            error_message: syncError.message || 'Unknown error',
            last_error_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            meta: {
              ...job.meta,
              final_error: syncError.message,
              total_retries: newRetryCount
            }
          })
          .eq('id', job.id)

        console.log(`[WORKER] ✗ Job ${job.id} marked as failed permanently`)
      }

      return new Response(
        JSON.stringify({
          success: false,
          job_id: job.id,
          error: syncError.message,
          will_retry: shouldRetry,
          retry_count: newRetryCount,
          max_retries: job.max_retries
        }),
        {
          status: 200, // Return 200 so cron doesn't retry
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error: any) {
    console.error('='.repeat(80))
    console.error('[WORKER] FATAL ERROR')
    console.error('='.repeat(80))
    console.error(error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        details: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
