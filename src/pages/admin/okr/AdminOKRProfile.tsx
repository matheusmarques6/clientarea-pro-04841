import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AdminOKRProfile = () => {
  const { id } = useParams();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Perfil OKR</h1>
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">ID: {id}</p>
          <p>Funcionalidade em desenvolvimento...</p>
        </CardContent>
      </Card>
    </div>
  );
};