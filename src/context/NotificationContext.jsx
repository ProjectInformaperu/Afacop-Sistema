import React, { createContext, useState, useContext } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = (text, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    
    // Auto-eliminar a los 4 segundos
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toasts-container" style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 11000,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none' // Para que no bloquee los clics en el fondo
        }}>
          {toasts.map(t => (
            <div 
              key={t.id} 
              className={`toast-alert toast-${t.type}`}
              style={{
                padding: '16px 24px',
                borderRadius: '16px',
                background: t.type === 'success' 
                  ? 'var(--c-success)' 
                  : t.type === 'error' 
                    ? 'var(--c-danger)' 
                    : 'var(--c-primary)',
                color: '#fff',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                fontSize: '14px',
                fontWeight: '700',
                animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                minWidth: '280px',
                maxWidth: '450px',
                whiteSpace: 'pre-wrap',
                pointerEvents: 'auto' // Permitir interactuar con el botón cerrar
              }}
            >
              <span>{t.text}</span>
              <button 
                onClick={() => removeToast(t.id)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#fff', 
                  cursor: 'pointer', 
                  fontSize: '16px', 
                  fontWeight: '900', 
                  opacity: 0.8, 
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >✕</button>
            </div>
          ))}
          <style>{`
            @keyframes toastSlideIn {
              from { transform: translateX(120%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
