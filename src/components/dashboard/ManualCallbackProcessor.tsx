import React from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManualCallbackProcessorProps {
  onSuccess?: () => void;
}

export const ManualCallbackProcessor: React.FC<ManualCallbackProcessorProps> = ({ onSuccess }) => {
  const { toast } = useToast();

  const processManualCallback = async () => {
    try {
      const request_id = "req_1758684000960_vmwhwrg65";
      const webhook_data = [
        {
          "klaviyo": {
            "revenue_total": 39813.1,
            "revenue_campaigns": 10584.94,
            "revenue_flows": 29228.16,
            "orders_attributed": 165,
            "conversions_campaigns": 51,
            "conversions_flows": 114,
            "top_campaigns_by_revenue": [
              {
                "id": "01K42SPVEDSP393BQCMP861KM5",
                "name": "[02/09] - [10:00] - [TODOS OS LEADS] - [1 - MÊS DO CLIENTE] - [BRASIL]",
                "revenue": 5506.12,
                "conversions": 26,
                "send_time": "2025-09-02T10:00:00+00:00"
              },
              {
                "id": "01K55B4WV1WFR6MY5219N1SMZY",
                "name": "[15/09] - [10:00] - [TODOS OS LEADS] - [2 - MÊS DO CLIENTE CATÁLOGO] - [BRASIL]",
                "revenue": 2205.18001,
                "conversions": 12,
                "send_time": "2025-09-15T13:00:00+00:00"
              }
            ],
            "top_campaigns_by_conversions": [
              {
                "id": "01K42SPVEDSP393BQCMP861KM5",
                "name": "[02/09] - [10:00] - [TODOS OS LEADS] - [1 - MÊS DO CLIENTE] - [BRASIL]",
                "revenue": 5506.12,
                "conversions": 26,
                "send_time": "2025-09-02T10:00:00+00:00"
              }
            ],
            "leads_total": "1+",
            "campaign_count": 5,
            "flow_count": 7,
            "campaigns_with_revenue": 4,
            "flows_with_revenue": 0,
            "flows_with_activity": 0,
            "flow_performance_averages": {
              "avg_open_rate": 0,
              "avg_click_rate": 0,
              "total_flow_deliveries": 0,
              "total_flow_opens": 0,
              "total_flow_clicks": 0
            }
          },
          "period": {
            "start": "2025-08-25",
            "end": "2025-09-24"
          },
          "store": {
            "id": "fb01d47f-c225-4862-81fa-21e20c239bed",
            "domain": ""
          },
          "metadata": {
            "metric_id": "U4uTCn",
            "request_id": "req_1758684000960_vmwhwrg65",
            "timestamp": "2025-09-24T03:21:57.407Z",
            "version": "2.0"
          },
          "status": "SUCCESS"
        }
      ];

      console.log('Processing manual callback for request_id:', request_id);

      const { data, error } = await supabase.functions.invoke('klaviyo_manual_callback', {
        body: { request_id, webhook_data }
      });

      if (error) {
        console.error('Manual callback error:', error);
        toast({
          title: "Erro",
          description: "Erro ao processar dados manualmente",
          variant: "destructive"
        });
        return;
      }

      console.log('Manual callback successful:', data);
      
      toast({
        title: "Sucesso",
        description: `Dados processados! Revenue: R$ ${data.revenue_processed?.toLocaleString('pt-BR')}`,
        variant: "default"
      });

      if (onSuccess) {
        onSuccess();
      }

    } catch (error) {
      console.error('Error processing manual callback:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao processar dados",
        variant: "destructive"
      });
    }
  };

  return (
    <Button 
      onClick={processManualCallback}
      variant="outline"
      size="sm"
    >
      Processar Dados Manualmente
    </Button>
  );
};