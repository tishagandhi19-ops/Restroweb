import React, { useState, useEffect } from 'react';
import AdminAuth from './components/AdminAuth';
import CustomerMenuView from './components/CustomerMenuView';

function App() {
  const [diningParams, setDiningParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const restaurantId = params.get('restaurantId');
    const table = params.get('table');
    return restaurantId ? { restaurantId, tableNumber: table || '1' } : null;
  });

  // Listen to popstate for clean back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const restaurantId = params.get('restaurantId');
      const table = params.get('table');
      setDiningParams(restaurantId ? { restaurantId, tableNumber: table || '1' } : null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleReturnToAdmin = () => {
    window.history.pushState({}, '', window.location.pathname);
    setDiningParams(null);
  };

  // If URL has restaurantId & table (or diner scanned QR code), show customer menu
  if (diningParams) {
    return (
      <main>
        <CustomerMenuView
          restaurantId={diningParams.restaurantId}
          tableNumber={diningParams.tableNumber}
          onBackToAdmin={handleReturnToAdmin}
        />
      </main>
    );
  }

  // Otherwise show the Admin Management Portal
  return (
    <main>
      <AdminAuth
        onPreviewGuest={(restaurantId, tableNumber) => {
          setDiningParams({ restaurantId, tableNumber });
        }}
      />
    </main>
  );
}

export default App;
