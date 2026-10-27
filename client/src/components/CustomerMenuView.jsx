import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Search,
  MapPin,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Minus,
  ShoppingBag,
  Bell,
  CheckCircle2,
  X,
  ChefHat,
  Sparkles,
} from 'lucide-react';
import { getPublicMenuApi } from '../api/menu';
import { placeTableOrderApi } from '../api/orders';

export default function CustomerMenuView({ restaurantId, tableNumber, onBackToAdmin }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart / Table Order state: { [itemId]: quantity }
  const [cart, setCart] = useState({});
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  // Call waiter toast notification
  const [callWaiterNotice, setCallWaiterNotice] = useState(false);

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

  // Cart operations
  const handleAddToCart = (itemId) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const handleRemoveFromCart = (itemId) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      if (current <= 1) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: current - 1 };
    });
  };

  // Cart summary calculations
  const cartItemsList = Object.entries(cart)
    .map(([itemId, qty]) => {
      const item = menuItems.find((m) => m._id === itemId);
      return item ? { ...item, quantity: qty } : null;
    })
    .filter(Boolean);

  const totalItemCount = cartItemsList.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalAmount = cartItemsList.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  // Place order for table
  const handlePlaceOrder = async () => {
    if (cartItemsList.length === 0) return;

    try {
      setPlacingOrder(true);
      const orderPayload = {
        restaurantId,
        tableNumber: tableNumber || '1',
        items: cartItemsList.map((item) => ({
          menuItem: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
        })),
        totalAmount,
        notes: kitchenNotes,
      };

      const result = await placeTableOrderApi(orderPayload);
      setPlacedOrder(result);
      setCart({});
      setKitchenNotes('');
      setIsOrderSheetOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to send order to kitchen. Please try again.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Call waiter handler
  const handleCallWaiter = () => {
    setCallWaiterNotice(true);
    setTimeout(() => setCallWaiterNotice(false), 4000);
  };

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
          <Loader2 size={36} className="spinner" />
          <h2>Loading Digital Menu</h2>
          <p>Connecting to {tableNumber ? `Table ${tableNumber}` : 'your table'}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guest-view-container">
        <div className="guest-error-box">
          <AlertCircle size={40} color="#dc2626" />
          <h2>Menu Unavailable</h2>
          <p>{error}</p>
          {onBackToAdmin && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onBackToAdmin}
              style={{ marginTop: '16px' }}
            >
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

          <div className="guest-header-actions">
            <button
              type="button"
              className="guest-waiter-btn"
              onClick={handleCallWaiter}
              title="Call waiter or assistance for this table"
            >
              <Bell size={15} />
              <span>Call Waiter</span>
            </button>

            {onBackToAdmin && (
              <button
                type="button"
                className="guest-back-btn"
                onClick={onBackToAdmin}
                title="Return to Admin Management"
              >
                <ArrowLeft size={14} />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Call Waiter Toast */}
      {callWaiterNotice && (
        <div className="guest-toast-notice">
          <Bell size={16} />
          <span>Waiter notified for <strong>Table {tableNumber || '1'}</strong>! A server is on their way.</span>
        </div>
      )}

      {/* Order Success Banner */}
      {placedOrder && (
        <div className="guest-order-success-card">
          <div className="success-icon-wrap">
            <CheckCircle2 size={24} color="#15803d" />
          </div>
          <div>
            <div className="success-title">Order Sent to Kitchen!</div>
            <div className="success-desc">
              Your order for <strong>Table {tableNumber}</strong> has been received by the kitchen.
              Sit back and enjoy your dining experience!
            </div>
          </div>
          <button
            type="button"
            className="success-close-btn"
            onClick={() => setPlacedOrder(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="guest-sub-bar">
        <span>
          🍽️ Welcome! Browse the digital menu below to select dishes for <strong>Table {tableNumber || '1'}</strong>.
        </span>
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

        {/* Category Filter Pills */}
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
              <UtensilsCrossed size={36} opacity={0.35} />
              <h3>No Dishes Found</h3>
              <p>Try searching for a different dish or category.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const qtyInCart = cart[item._id] || 0;

              return (
                <div key={item._id} className="guest-item-card">
                  <div className="guest-item-details">
                    <div className="guest-item-cat-label">{item.category}</div>
                    <h3 className="guest-item-title">{item.name}</h3>
                    {item.description && <p className="guest-item-desc">{item.description}</p>}
                    <div className="guest-item-price">${Number(item.price).toFixed(2)}</div>
                  </div>

                  <div className="guest-item-action-area">
                    {qtyInCart === 0 ? (
                      <button
                        type="button"
                        className="guest-add-btn"
                        onClick={() => handleAddToCart(item._id)}
                      >
                        <Plus size={15} />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div className="guest-stepper">
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleRemoveFromCart(item._id)}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="stepper-val">{qtyInCart}</span>
                        <button
                          type="button"
                          className="stepper-btn"
                          onClick={() => handleAddToCart(item._id)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar (appears when guest has selected items) */}
      {totalItemCount > 0 && (
        <div className="guest-floating-cart-bar">
          <div className="cart-bar-left">
            <div className="cart-bar-count">
              <ShoppingBag size={17} />
              <span>{totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}</span>
            </div>
            <div className="cart-bar-total">${totalAmount.toFixed(2)}</div>
          </div>

          <button
            type="button"
            className="cart-bar-action-btn"
            onClick={() => setIsOrderSheetOpen(true)}
          >
            <span>Review Order</span>
            <span className="cart-badge-dot">Table {tableNumber}</span>
          </button>
        </div>
      )}

      {/* Modal / Sheet: Table Order Review */}
      {isOrderSheetOpen && (
        <div className="modal-backdrop">
          <div className="modal-card guest-order-modal">
            <div className="modal-header">
              <div>
                <h2>Table {tableNumber || '1'} Order Summary</h2>
                <span className="guest-order-subtitle">Review items before sending to the kitchen</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsOrderSheetOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="guest-cart-items-list">
              {cartItemsList.map((item) => (
                <div key={item._id} className="cart-item-row">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-unit">${Number(item.price).toFixed(2)} each</div>
                  </div>

                  <div className="cart-item-controls">
                    <div className="guest-stepper small">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => handleRemoveFromCart(item._id)}
                      >
                        <Minus size={13} />
                      </button>
                      <span className="stepper-val">{item.quantity}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => handleAddToCart(item._id)}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div className="cart-item-subtotal">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label">Special Requests / Notes for Chef</label>
              <textarea
                className="form-input form-textarea"
                placeholder="e.g. Extra napkins, dressing on the side, allergies..."
                value={kitchenNotes}
                onChange={(e) => setKitchenNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="cart-totals-summary">
              <div className="summary-row">
                <span>Table</span>
                <strong>Table {tableNumber || '1'}</strong>
              </div>
              <div className="summary-row total">
                <span>Total Amount</span>
                <span className="total-val">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsOrderSheetOpen(false)}
              >
                Back to Menu
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePlaceOrder}
                disabled={placingOrder}
              >
                {placingOrder ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Sending to Kitchen...</span>
                  </>
                ) : (
                  <>
                    <ChefHat size={16} />
                    <span>Send Order for Table {tableNumber || '1'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="guest-footer">
        <p>RestoWeb Digital Dining • Table {tableNumber || '1'} Contactless Menu</p>
      </footer>
    </div>
  );
}
