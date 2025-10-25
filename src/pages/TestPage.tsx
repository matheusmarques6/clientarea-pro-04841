// Página de teste simples para debug
export default function TestPage() {
  return (
    <div style={{
      background: 'white',
      color: 'black',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px',
      padding: '40px'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold' }}>
        ✅ TESTE - Servidor Funcionando!
      </h1>
      <p style={{ fontSize: '24px' }}>
        Se você está vendo esta página, o React está renderizando corretamente.
      </p>
      <div style={{ fontSize: '18px', textAlign: 'center' }}>
        <p>URL atual: {window.location.href}</p>
        <p>Timestamp: {new Date().toLocaleString('pt-BR')}</p>
      </div>
    </div>
  );
}
