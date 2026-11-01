import React, { useState, useEffect } from 'react';
import AdminAuth from './components/AdminAuth';
import CustomerMenuView from './components/CustomerMenuView';

function App() {
  const [diningParams, setDiningParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const restaurantId = params.get('restaurantId');
    const token = params.get('token') || params.get('tableToken');
    const table = params.get('table');
    return restaurantId && (token || table)
      ? { restaurantId, token: token || null, tableNumber: table || null }
      : null;
  });

  // Listen to popstate for clean back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const restaurantId = params.get('restaurantId');
      const token = params.get('token') || params.get('tableToken');
      const table = params.get('table');
      setDiningParams(
        restaurantId && (token || table)
          ? { restaurantId, token: token || null, tableNumber: table || null }
          : null
      );
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleReturnToAdmin = () => {
    window.history.pushState({}, '', window.location.pathname);
    setDiningParams(null);
  };

  // If URL has restaurantId & token (or table), show customer menu
  if (diningParams) {
    return (
      <main>
        <CustomerMenuView
          restaurantId={diningParams.restaurantId}
          token={diningParams.token}
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
        onPreviewGuest={(restaurantId, tableNumber, token) => {
          setDiningParams({ restaurantId, tableNumber, token });
        }}
      />
    </main>
  );
}

export default App;
