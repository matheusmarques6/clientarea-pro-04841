import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/hooks/useStores';

export default function DebugRoute() {
  const { id: storeId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { store, isLoading: storeLoading } = useStore(storeId!);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'white',
      color: 'black',
      padding: '40px',
      fontFamily: 'monospace',
      fontSize: '16px',
      lineHeight: '1.6'
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '30px' }}>
        🔍 DEBUG - Status da Aplicação
      </h1>

      <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>📍 Parâmetros da URL:</h2>
        <p><strong>Store ID:</strong> {storeId || '❌ NENHUM'}</p>
        <p><strong>URL completa:</strong> {window.location.href}</p>
      </div>

      <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>🔐 Status de Autenticação:</h2>
        <p><strong>Loading:</strong> {authLoading ? '⏳ CARREGANDO...' : '✅ COMPLETO'}</p>
        <p><strong>Usuário:</strong> {user ? `✅ AUTENTICADO (${user.email})` : '❌ NÃO AUTENTICADO'}</p>
        {user && (
          <>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </>
        )}
      </div>

      <div style={{ background: '#fff3e0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>🏪 Status da Loja:</h2>
        <p><strong>Loading:</strong> {storeLoading ? '⏳ CARREGANDO...' : '✅ COMPLETO'}</p>
        <p><strong>Loja:</strong> {store ? `✅ ENCONTRADA` : '❌ NÃO ENCONTRADA'}</p>
        {store && (
          <>
            <p><strong>ID:</strong> {store.id}</p>
            <p><strong>Nome:</strong> {store.name}</p>
            <p><strong>Moeda:</strong> {store.currency || 'N/A'}</p>
            <p><strong>Status:</strong> {store.status || 'N/A'}</p>
          </>
        )}
      </div>

      <div style={{ background: '#ffebee', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>⚠️ Diagnóstico:</h2>
        {authLoading && <p>🔴 <strong>PROBLEMA:</strong> Autenticação travada em "loading"</p>}
        {!authLoading && !user && <p>🔴 <strong>PROBLEMA:</strong> Usuário não está autenticado. Deveria redirecionar para /auth</p>}
        {!authLoading && user && storeLoading && <p>🟡 <strong>AVISO:</strong> Loja ainda está carregando</p>}
        {!authLoading && user && !storeLoading && !store && <p>🔴 <strong>PROBLEMA:</strong> Loja não foi encontrada. ID pode estar errado.</p>}
        {!authLoading && user && !storeLoading && store && <p>🟢 <strong>SUCESSO:</strong> Tudo OK! O problema está no componente filho.</p>}
      </div>

      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>💡 Próximos Passos:</h2>
        <ol style={{ paddingLeft: '20px' }}>
          <li>Se "Autenticação" está travada: Problema no useAuth()</li>
          <li>Se "Não autenticado": Faça login primeiro em /auth</li>
          <li>Se "Loja não encontrada": Verifique o ID da loja na URL</li>
          <li>Se tudo OK: O problema está em FormularioPortal ou Returns</li>
        </ol>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#e8f5e9', borderRadius: '8px' }}>
        <p><strong>Timestamp:</strong> {new Date().toLocaleString('pt-BR')}</p>
        <p><strong>Navegador:</strong> {navigator.userAgent}</p>
      </div>
    </div>
  );
}
