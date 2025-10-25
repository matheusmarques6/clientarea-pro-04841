// Edge Function: generate-shipping-label
// Priority 3: International shipping label generation
// Supports: Correios, FedEx, DHL, UPS

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShippingLabelRequest {
  request_id: string;
  carrier: 'correios' | 'fedex' | 'dhl' | 'ups';
  service_level: string; // e.g., 'PAC', 'SEDEX', 'EXPRESS', 'PRIORITY'
  package_weight: number; // in kg
  package_dimensions: {
    length: number; // cm
    width: number; // cm
    height: number; // cm
  };
  insurance_value?: number;
  delivery_instructions?: string;
}

interface ShippingLabelResponse {
  success: boolean;
  data?: {
    label_id: string;
    tracking_code: string;
    tracking_url: string;
    label_url: string;
    carrier: string;
    service_level: string;
    cost: number;
    currency: string;
    estimated_delivery_date?: string;
  };
  error?: string;
}

// Carrier API integrations
class CarrierService {
  private supabase: any;
  private storeId: string;

  constructor(supabase: any, storeId: string) {
    this.supabase = supabase;
    this.storeId = storeId;
  }

  async generateLabel(
    carrier: string,
    request: any,
    labelRequest: ShippingLabelRequest
  ): Promise<any> {
    switch (carrier) {
      case 'correios':
        return this.generateCorreiosLabel(request, labelRequest);
      case 'fedex':
        return this.generateFedExLabel(request, labelRequest);
      case 'dhl':
        return this.generateDHLLabel(request, labelRequest);
      case 'ups':
        return this.generateUPSLabel(request, labelRequest);
      default:
        throw new Error(`Unsupported carrier: ${carrier}`);
    }
  }

  private async generateCorreiosLabel(request: any, labelRequest: ShippingLabelRequest) {
    // Correios API Integration
    // Note: Requires Correios contract and API credentials
    // API: https://api.correios.com.br/reverse-logistics/v1/

    const { data: store } = await this.supabase
      .from('stores')
      .select('correios_contract, correios_access_token')
      .eq('id', this.storeId)
      .single();

    if (!store?.correios_access_token) {
      throw new Error('Correios integration not configured for this store');
    }

    // Mock implementation - Replace with actual Correios API call
    const trackingCode = `BR${Math.random().toString().slice(2, 13)}BR`;

    return {
      tracking_code: trackingCode,
      tracking_url: `https://rastreamento.correios.com.br/app/index.php?codigo=${trackingCode}`,
      label_url: `https://storage.supabase.com/labels/${trackingCode}.pdf`,
      cost: this.calculateCorreiosCost(labelRequest),
      currency: 'BRL',
      estimated_delivery_date: this.calculateEstimatedDelivery(labelRequest.service_level, 'BR'),
    };
  }

  private async generateFedExLabel(request: any, labelRequest: ShippingLabelRequest) {
    // FedEx API Integration
    // API: https://developer.fedex.com/api/en-us/catalog/ship/v1/docs.html

    const { data: store } = await this.supabase
      .from('stores')
      .select('fedex_account_number, fedex_api_key, fedex_secret_key')
      .eq('id', this.storeId)
      .single();

    if (!store?.fedex_api_key) {
      throw new Error('FedEx integration not configured for this store');
    }

    // Mock implementation - Replace with actual FedEx API call
    const trackingCode = `${Math.random().toString().slice(2, 14)}`;

    return {
      tracking_code: trackingCode,
      tracking_url: `https://www.fedex.com/fedextrack/?trknbr=${trackingCode}`,
      label_url: `https://storage.supabase.com/labels/fedex_${trackingCode}.pdf`,
      cost: this.calculateFedExCost(labelRequest),
      currency: 'USD',
      estimated_delivery_date: this.calculateEstimatedDelivery(labelRequest.service_level, 'INTL'),
    };
  }

  private async generateDHLLabel(request: any, labelRequest: ShippingLabelRequest) {
    // DHL API Integration
    // API: https://developer.dhl.com/api-reference/shipment-booking

    const { data: store } = await this.supabase
      .from('stores')
      .select('dhl_account_number, dhl_api_key')
      .eq('id', this.storeId)
      .single();

    if (!store?.dhl_api_key) {
      throw new Error('DHL integration not configured for this store');
    }

    // Mock implementation - Replace with actual DHL API call
    const trackingCode = `${Math.random().toString().slice(2, 14)}`;

    return {
      tracking_code: trackingCode,
      tracking_url: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingCode}`,
      label_url: `https://storage.supabase.com/labels/dhl_${trackingCode}.pdf`,
      cost: this.calculateDHLCost(labelRequest),
      currency: 'USD',
      estimated_delivery_date: this.calculateEstimatedDelivery(labelRequest.service_level, 'INTL'),
    };
  }

  private async generateUPSLabel(request: any, labelRequest: ShippingLabelRequest) {
    // UPS API Integration
    // API: https://developer.ups.com/api/reference/shipping/ship

    const { data: store } = await this.supabase
      .from('stores')
      .select('ups_account_number, ups_api_key')
      .eq('id', this.storeId)
      .single();

    if (!store?.ups_api_key) {
      throw new Error('UPS integration not configured for this store');
    }

    // Mock implementation - Replace with actual UPS API call
    const trackingCode = `1Z${Math.random().toString().slice(2, 18)}`;

    return {
      tracking_code: trackingCode,
      tracking_url: `https://www.ups.com/track?tracknum=${trackingCode}`,
      label_url: `https://storage.supabase.com/labels/ups_${trackingCode}.pdf`,
      cost: this.calculateUPSCost(labelRequest),
      currency: 'USD',
      estimated_delivery_date: this.calculateEstimatedDelivery(labelRequest.service_level, 'INTL'),
    };
  }

  private calculateCorreiosCost(request: ShippingLabelRequest): number {
    // Simplified cost calculation - Replace with actual Correios pricing
    const baseRate = request.service_level === 'SEDEX' ? 25.0 : 15.0;
    const weightCost = request.package_weight * 2.5;
    return baseRate + weightCost;
  }

  private calculateFedExCost(request: ShippingLabelRequest): number {
    // Simplified cost calculation - Replace with actual FedEx pricing
    const baseRate = request.service_level === 'EXPRESS' ? 75.0 : 50.0;
    const weightCost = request.package_weight * 5.0;
    return baseRate + weightCost;
  }

  private calculateDHLCost(request: ShippingLabelRequest): number {
    // Simplified cost calculation - Replace with actual DHL pricing
    const baseRate = 80.0;
    const weightCost = request.package_weight * 6.0;
    return baseRate + weightCost;
  }

  private calculateUPSCost(request: ShippingLabelRequest): number {
    // Simplified cost calculation - Replace with actual UPS pricing
    const baseRate = request.service_level === 'EXPRESS' ? 70.0 : 55.0;
    const weightCost = request.package_weight * 5.5;
    return baseRate + weightCost;
  }

  private calculateEstimatedDelivery(serviceLevel: string, region: string): string {
    const daysToAdd = region === 'BR'
      ? (serviceLevel === 'SEDEX' ? 2 : 5)
      : (serviceLevel === 'EXPRESS' ? 3 : 7);

    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + daysToAdd);
    return estimatedDate.toISOString();
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST request.'
        }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const labelRequest: ShippingLabelRequest = await req.json();

    // Validate required fields
    if (!labelRequest.request_id || !labelRequest.carrier || !labelRequest.package_weight) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: request_id, carrier, package_weight'
        } as ShippingLabelResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate carrier
    const validCarriers = ['correios', 'fedex', 'dhl', 'ups'];
    if (!validCarriers.includes(labelRequest.carrier)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid carrier. Must be one of: ${validCarriers.join(', ')}`
        } as ShippingLabelResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the return request
    const { data: returnRequest, error: requestError } = await supabaseClient
      .from('rm_requests')
      .select('*')
      .eq('id', labelRequest.request_id)
      .single();

    if (requestError || !returnRequest) {
      console.error('Request not found:', requestError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Return request not found'
        } as ShippingLabelResponse),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if request is in a valid status for label generation
    const validStatuses = ['approved', 'label_pending'];
    if (!validStatuses.includes(returnRequest.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot generate label. Request status must be 'approved' or 'label_pending', current status: ${returnRequest.status}`
        } as ShippingLabelResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate shipping label via carrier
    const carrierService = new CarrierService(supabaseClient, returnRequest.store_id);
    const labelData = await carrierService.generateLabel(
      labelRequest.carrier,
      returnRequest,
      labelRequest
    );

    // Insert label record
    const { data: label, error: labelError } = await supabaseClient
      .from('rm_shipping_labels')
      .insert({
        request_id: labelRequest.request_id,
        carrier: labelRequest.carrier,
        service_level: labelRequest.service_level,
        tracking_code: labelData.tracking_code,
        tracking_url: labelData.tracking_url,
        label_url: labelData.label_url,
        cost: labelData.cost,
        currency: labelData.currency,
        status: 'generated',
        package_weight: labelRequest.package_weight,
        package_dimensions: labelRequest.package_dimensions,
        insurance_value: labelRequest.insurance_value,
        estimated_delivery_date: labelData.estimated_delivery_date,
      })
      .select()
      .single();

    if (labelError) {
      console.error('Error creating label record:', labelError);
      throw new Error('Failed to save label data');
    }

    // Update request with tracking information
    const { error: updateError } = await supabaseClient
      .from('rm_requests')
      .update({
        status: 'label_generated',
        tracking_code: labelData.tracking_code,
        tracking_carrier: labelRequest.carrier,
        tracking_url: labelData.tracking_url,
      })
      .eq('id', labelRequest.request_id);

    if (updateError) {
      console.error('Error updating request:', updateError);
    }

    // Create event log
    await supabaseClient
      .from('rm_request_events')
      .insert({
        request_id: labelRequest.request_id,
        event_type: 'label_generated',
        description: `Shipping label generated via ${labelRequest.carrier.toUpperCase()} - ${labelRequest.service_level}. Tracking: ${labelData.tracking_code}`,
      });

    const response: ShippingLabelResponse = {
      success: true,
      data: {
        label_id: label.id,
        tracking_code: labelData.tracking_code,
        tracking_url: labelData.tracking_url,
        label_url: labelData.label_url,
        carrier: labelRequest.carrier,
        service_level: labelRequest.service_level,
        cost: labelData.cost,
        currency: labelData.currency,
        estimated_delivery_date: labelData.estimated_delivery_date,
      },
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      } as ShippingLabelResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
