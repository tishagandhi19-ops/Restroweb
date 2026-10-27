import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Search, MapPin, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { getPublicMenuApi } from '../api/menu';

export default function CustomerMenuView({ restaurantId, tableNumber, onBackToAdmin }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        setError('');
        const res = await getPublicMenuApi(restaurantId);
        setRestaurant(res.restaurant);
        setMenuItems(res.data || []);
      } catch (err) {
        setError(err.message || 'Unable to load menu. Please ask your server.');
      } finally {
        setLoading(false);
      }
    }

    if (restaurantId) {
      loadMenu();
    } else {
      setError('Invalid dining link. Missing restaurant identifier.');
      setLoading(false);
    }
  }, [restaurantId]);

  const categories = ['All', ...new Set(menuItems.map((item) => item.category).filter(Boolean))];

  const filteredItems = menuItems.filter((item) => {
    const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  if (loading) {
    return (
      <div className="guest-view-container">
        <div className="guest-loading-box">
          <Loader2 size={32} className="spinner" />
          <p>Loading digital menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guest-view-container">
        <div className="guest-error-box">
          <AlertCircle size={36} color="#ef4444" />
          <h2>Menu Unavailable</h2>
          <p>{error}</p>
          {onBackToAdmin && (
            <button type="button" className="btn btn-secondary" onClick={onBackToAdmin} style={{ marginTop: '16px' }}>
              <ArrowLeft size={16} /> Return to Admin
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="guest-view-container">
      {/* Top Bar / Header */}
      <header className="guest-header">
        <div className="guest-header-inner">
          <div className="guest-brand">
            <div className="brand-icon small">
              <UtensilsCrossed size={18} />
            </div>
            <div>
              <h1 className="guest-resto-name">{restaurant?.name || 'Restaurant'}</h1>
              <div className="guest-table-badge">
                <MapPin size={12} />
                <span>Table {tableNumber || '1'}</span>
              </div>
            </div>
          </div>

          {onBackToAdmin && (
            <button
              type="button"
              className="guest-back-btn"
              onClick={onBackToAdmin}
              title="Return to Admin Management"
            >
              <ArrowLeft size={15} />
              <span>Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* Guest Notice */}
      <div className="guest-sub-bar">
        <span>👋 Welcome! Browse our menu below. Your table number is <strong>Table {tableNumber || '1'}</strong>.</span>
      </div>

      <main className="guest-body">
        {/* Search Input */}
        <div className="guest-search-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="guest-search-input"
            placeholder="Search food, beverages, desserts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div className="guest-categories-scroll">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`guest-category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items List */}
        <div className="guest-menu-list">
          {filteredItems.length === 0 ? (
            <div className="guest-empty-state">
              <UtensilsCrossed size={32} opacity={0.4} />
              <p>No dishes found matching your selection.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div key={item._id} className="guest-item-card">
                <div className="guest-item-details">
                  <div className="guest-item-cat-label">{item.category}</div>
                  <h3 className="guest-item-title">{item.name}</h3>
                  {item.description && <p className="guest-item-desc">{item.description}</p>}
                </div>
                <div className="guest-item-price-wrap">
                  <span className="guest-item-price">${Number(item.price).toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="guest-footer">
        <p>Powered by RestoWeb Contactless QR Dining</p>
      </footer>
    </div>
  );
}
