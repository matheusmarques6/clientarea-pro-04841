// ============================================================================
// KLAVIYO CALLBACK - SECURED VERSION
// Receives webhook callbacks from N8N with signature validation
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'
import { getCorsHeaders, handleCorsPreFlight } from '../_shared/cors.ts'
import { validateWebhookSignature } from '../_shared/webhook-validator.ts'
import { createSuccessResponse, createErrorResponse, ErrorCode, HttpStatus } from '../_shared/types.ts'

const logger = createLogger('klaviyo_callback')

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreFlight(req)
  }

  if (req.method !== 'POST') {
    logger.warn('Method not allowed', { method: req.method })
    return new Response(
      JSON.stringify(createErrorResponse(ErrorCode.BAD_REQUEST, 'Method not allowed')),
      { status: HttpStatus.BAD_REQUEST, headers: corsHeaders }
    )
  }

  try {
    // Get webhook payload as text (needed for signature validation)
    const body = await req.text()

    // Validate webhook signature (if feature enabled)
    const webhookValidationEnabled = Deno.env.get('FEATURE_WEBHOOK_VALIDATION') === 'true'
    const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET')

    if (webhookValidationEnabled && webhookSecret) {
      const signature = req.headers.get('x-n8n-signature')
      const isValid = await validateWebhookSignature(body, signature, webhookSecret)

      if (!isValid) {
        logger.error('Invalid webhook signature', new Error('Signature mismatch'), {
          receivedSignature: signature?.substring(0, 20) + '...',
          payloadLength: body.length
        })

        return new Response(
          JSON.stringify(createErrorResponse(ErrorCode.FORBIDDEN, 'Invalid webhook signature')),
          { status: HttpStatus.FORBIDDEN, headers: corsHeaders }
        )
      }

      logger.info('Webhook signature validated successfully')
    } else if (webhookValidationEnabled && !webhookSecret) {
      logger.warn('Webhook validation enabled but N8N_WEBHOOK_SECRET not configured')
    }

    // Parse payload
    let payload
    try {
      payload = JSON.parse(body)
    } catch (error: any) {
      logger.error('Invalid JSON payload', error)
      return new Response(
        JSON.stringify(createErrorResponse(ErrorCode.BAD_REQUEST, 'Invalid JSON payload')),
        { status: HttpStatus.BAD_REQUEST, headers: corsHeaders }
      )
    }

    logger.info('Webhook received', {
      payloadSize: body.length,
      hasSignature: !!req.headers.get('x-n8n-signature')
    })

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Normalize payload structure: accept object or array with single item
    const data = Array.isArray(payload) ? payload[0] : payload

    logger.debug('Processing normalized payload', {
      hasMetadata: !!data?.metadata,
      hasKlaviyo: !!data?.klaviyo,
      hasStore: !!data?.store
    })

    // Extract fields with fallbacks
    const requestId = data?.metadata?.request_id ?? data?.request_id ?? data?.job?.request_id ?? null

    // Period can be object {start,end}, top-level fields, or string "YYYY-MM-DD to YYYY-MM-DD"
    let periodStart = data?.period?.start ?? data?.period_start ?? data?.periodStart ?? null
    let periodEnd = data?.period?.end ?? data?.period_end ?? data?.periodEnd ?? null

    if ((!periodStart || !periodEnd) && typeof data?.period === 'string') {
      const parts = data.period.split(' to ')
      if (parts.length === 2) {
        periodStart = parts[0]
        periodEnd = parts[1]
      }
    }

    const storeId = data?.store?.id ?? data?.store_id ?? data?.storeId ?? null
    const status = data?.status ?? 'SUCCESS'
    const klaviyo = data?.klaviyo ?? data?.summary?.klaviyo ?? null

    // Try to find job by request_id first, then by store_id and period if not found
    let job
    let jobError

    // First try exact request_id match if we have one
    if (requestId) {
      const jobResult = await supabase
        .from('n8n_jobs')
        .select('*')
        .eq('request_id', requestId)
        .single()

      job = jobResult.data
      jobError = jobResult.error

      if (job) {
        logger.info('Job found by request_id', { request_id: requestId, job_id: job.id })
      }
    }

    // If not found and we have store/period info, try that
    if (!job && storeId && periodStart && periodEnd) {
      logger.info('Attempting to find job by store/period', { storeId, periodStart, periodEnd })

      const jobResult = await supabase
        .from('n8n_jobs')
        .select('*')
        .eq('store_id', storeId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .in('status', ['QUEUED', 'PROCESSING'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      job = jobResult.data
      jobError = jobResult.error

      if (job) {
        logger.info('Job found by store/period', { job_id: job.id })
      }
    }

    if (!job) {
      logger.error('Job not found', new Error('No matching job'), {
        requestId,
        storeId,
        periodStart,
        periodEnd,
        dbError: jobError
      })

      return new Response(
        JSON.stringify(createErrorResponse(ErrorCode.NOT_FOUND, 'Job not found')),
        { status: HttpStatus.NOT_FOUND, headers: corsHeaders }
      )
    }

    // Update job status
    const updateData: any = {
      status: status === 'ERROR' ? 'ERROR' : 'SUCCESS',
      finished_at: new Date().toISOString(),
      payload: data
    }

    if (status === 'ERROR') {
      updateData.error = data?.error ?? data?.message ?? 'Unknown error'
    }

    const { error: updateError } = await supabase
      .from('n8n_jobs')
      .update(updateData)
      .eq('id', job.id)

    if (updateError) {
      logger.error('Failed to update job', updateError as Error, { job_id: job.id })
      return new Response(
        JSON.stringify(createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update job')),
        { status: HttpStatus.INTERNAL_ERROR, headers: corsHeaders }
      )
    }

    // If successful and we have Klaviyo data, save it
    if (status === 'SUCCESS' && klaviyo) {
      logger.info('Saving Klaviyo summary', {
        storeId: job.store_id,
        periodStart: job.period_start,
        periodEnd: job.period_end
      })

      const { error: summaryError } = await supabase
        .from('klaviyo_summaries')
        .upsert({
          store_id: job.store_id,
          period_start: job.period_start,
          period_end: job.period_end,
          revenue_total: klaviyo.revenue_total ?? 0,
          revenue_campaigns: klaviyo.revenue_campaigns ?? 0,
          revenue_flows: klaviyo.revenue_flows ?? 0,
          orders_attributed: klaviyo.orders_attributed ?? 0,
          conversions_campaigns: klaviyo.conversions_campaigns ?? 0,
          conversions_flows: klaviyo.conversions_flows ?? 0,
          // ... other fields ...
          updated_at: new Date().toISOString()
        })

      if (summaryError) {
        logger.error('Failed to save Klaviyo summary', summaryError as Error)
        // Don't fail the webhook, just log the error
      }
    }

    logger.info('Webhook processed successfully', {
      job_id: job.id,
      status: updateData.status
    })

    return new Response(
      JSON.stringify(createSuccessResponse({
        job_id: job.id,
        status: updateData.status
      })),
      { status: HttpStatus.OK, headers: corsHeaders }
    )

  } catch (error: any) {
    logger.error('Unexpected error processing webhook', error, {
      message: error.message,
      stack: error.stack
    })

    return new Response(
      JSON.stringify(createErrorResponse(ErrorCode.INTERNAL_ERROR, 'Internal server error')),
      { status: HttpStatus.INTERNAL_ERROR, headers: corsHeaders }
    )
  }
})
