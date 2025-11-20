// ============================================================================
// START KLAVIYO JOB - MIGRATED VERSION (EXAMPLE)
// This is an example of how the migrated version should look
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createLogger } from '../_shared/logger.ts'
import { getCorsHeaders, handleCorsPreFlight } from '../_shared/cors.ts'
import { createSuccessResponse, createErrorResponse, ErrorCode, HttpStatus } from '../_shared/types.ts'

// Initialize logger
const logger = createLogger('start_klaviyo_job')

// Generate unique request ID
function generateRequestId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  return `req_${timestamp}_${random}`
}

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
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      logger.warn('Missing authorization header')
      return new Response(
        JSON.stringify(createErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized')),
        { status: HttpStatus.UNAUTHORIZED, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      logger.error('Authentication failed', authError || new Error('No user'), { token: token.substring(0, 20) + '...' })
      return new Response(
        JSON.stringify(createErrorResponse(ErrorCode.UNAUTHORIZED, 'Unauthorized')),
        { status: HttpStatus.UNAUTHORIZED, headers: corsHeaders }
      )
    }

    // Get request body
    const { store_id, period_start, period_end } = await req.json()

    if (!store_id || !period_start || !period_end) {
      logger.warn('Missing required fields', { store_id, period_start, period_end })
      return new Response(
        JSON.stringify(createErrorResponse(
          ErrorCode.BAD_REQUEST,
          'Missing required fields: store_id, period_start, period_end'
        )),
        { status: HttpStatus.BAD_REQUEST, headers: corsHeaders }
      )
    }

    logger.info('Job request received', {
      user_id: user.id,
      store_id,
      period_start,
      period_end
    })

    // ... rest of the function logic ...

    // Example success response
    const result = {
      job_id: generateRequestId(),
      status: 'queued'
    }

    logger.info('Job created successfully', result)

    return new Response(
      JSON.stringify(createSuccessResponse(result)),
      { status: HttpStatus.OK, headers: corsHeaders }
    )

  } catch (error: any) {
    logger.error('Unexpected error', error, {
      message: error.message,
      stack: error.stack
    })

    return new Response(
      JSON.stringify(createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred'
      )),
      { status: HttpStatus.INTERNAL_ERROR, headers: corsHeaders }
    )
  }
})
