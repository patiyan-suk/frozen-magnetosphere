import { useState } from 'react'
import AddSaleForm from './components/AddSaleForm'
import Dashboard from './components/Dashboard'
import Notes from './components/Notes'
import Expenses from './components/Expenses'
import LoginPage from './components/LoginPage'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppContent() {
  const [view, setView] = useState('add'); // 'add' or 'dashboard'
  const [editingSaleId, setEditingSaleId] = useState(null);
  const { t, locale, setLocale } = useLanguage();
  const { user, logout } = useAuth();

  const toggleLanguage = () => {
    setLocale(locale === 'th' ? 'en' : 'th');
  };

  const handleEdit = (saleId) => {
    setEditingSaleId(saleId);
    setView('add');
  };

  const handleSaleAdded = () => {
    setEditingSaleId(null);
    setView('dashboard');
  };

  if (!user) {
    return (
      <div className="container">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '50px' }} />
            <h1>{t('appTitle')}</h1>
          </div>
          <button
            onClick={toggleLanguage}
            className="btn"
            style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)', fontSize: '0.9rem' }}
          >
            {locale === 'th' ? '🇺🇸 EN' : '🇹🇭 TH'}
          </button>
        </header>
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '50px' }} />
          <h1>{t('appTitle')}</h1>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('welcome')}, {user.username}
          </div>
          <button
            onClick={toggleLanguage}
            className="btn"
            style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.1)', fontSize: '0.9rem' }}
          >
            {locale === 'th' ? '🇺🇸 EN' : '🇹🇭 TH'}
          </button>
          <button
            onClick={logout}
            className="btn"
            style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '0.9rem' }}
          >
            {t('logout')}
          </button>
        </div>
      </header>

      <div className="nav" style={{ justifyContent: 'center' }}>
        <div
          className={`nav-item ${view === 'add' ? 'active' : ''}`}
          onClick={() => {
            setEditingSaleId(null);
            setView('add');
          }}
        >
          {t('addSale')}
        </div>
        <div
          className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          {t('dashboard')}
        </div>
        <div
          className={`nav-item ${view === 'notes' ? 'active' : ''}`}
          onClick={() => setView('notes')}
        >
          {t('notes')}
        </div>
        <div
          className={`nav-item ${view === 'expenses' ? 'active' : ''}`}
          onClick={() => setView('expenses')}
        >
          {t('expenses')}
        </div>
      </div>

      {view === 'add' ? (
        <AddSaleForm
          onSaleAdded={handleSaleAdded}
          editingSaleId={editingSaleId}
          onCancelEdit={() => setEditingSaleId(null)}
        />
      ) : view === 'notes' ? (
        <Notes />
      ) : view === 'expenses' ? (
        <Expenses />
      ) : (
        <Dashboard onEdit={handleEdit} />
      )}
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
