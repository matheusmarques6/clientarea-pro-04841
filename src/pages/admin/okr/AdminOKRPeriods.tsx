import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useOKRData } from '@/hooks/useOKRData';

export const AdminOKRPeriods = () => {
  const { periods, currentPeriod } = useOKRData();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Períodos OKR</h1>
      <Card>
        <CardHeader>
          <CardTitle>Períodos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {periods.map((period) => (
              <div key={period.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{period.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(period.start_date).toLocaleDateString('pt-BR')} - 
                      {new Date(period.end_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {period.is_active && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Ativo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};