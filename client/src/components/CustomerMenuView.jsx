import React, { useState, useEffect, useCallback } from 'react';
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
  User,
  Phone,
  Clock,
  Edit3,
  Check,
  RefreshCw,
} from 'lucide-react';
import { getPublicMenuApi } from '../api/menu';
import { placeTableOrderApi } from '../api/orders';
import { verifyPublicTableApi } from '../api/tables';

const ONE_HOUR_MS = 60 * 60 * 1000;

function getSessionKey(restaurantId, tableNumber) {
  return `restoweb_customer_${restaurantId}_table_${String(tableNumber || '1').trim().toLowerCase()}`;
}

export default function CustomerMenuView({ restaurantId, tableNumber, onBackToAdmin }) {
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState(null);
  const [error, setError] = useState('');
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Customer Session State (1-Hour Expiry)
  const [customer, setCustomer] = useState(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(60);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '' });
  const [formError, setFormError] = useState('');
  const [sessionResumedNotice, setSessionResumedNotice] = useState(false);

  // Cart / Table Order state: { [itemId]: quantity }
  const [cart, setCart] = useState({});
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [kitchenNotes, setKitchenNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  // Call waiter toast notification
  const [callWaiterNotice, setCallWaiterNotice] = useState(false);

  // Quick remarks suggestion chips
  const quickRemarks = [
    '🌶️ Make it spicy',
    '🌱 Less spicy / mild',
    '🧅 No onions',
    '🧂 Less salt',
    '🍽️ Extra cutlery & napkins',
    '🧊 Less ice in drinks',
  ];

  // Helper to load session from localStorage if within 1 hour
  const checkStoredSession = useCallback(() => {
    if (!restaurantId || !tableNumber) return null;
    const key = getSessionKey(restaurantId, tableNumber);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      const elapsed = Date.now() - (data.createdAt || 0);
      if (elapsed < ONE_HOUR_MS) {
        const remainingMins = Math.max(1, Math.ceil((ONE_HOUR_MS - elapsed) / 60000));
        setSessionTimeLeft(remainingMins);
        return data;
      } else {
        // Expired after 1 hour
        localStorage.removeItem(key);
        return null;
      }
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }, [restaurantId, tableNumber]);

  // Periodic check to update remaining session time & detect expiry
  useEffect(() => {
    if (!customer) return;

    const interval = setInterval(() => {
      const validSession = checkStoredSession();
      if (validSession) {
        const elapsed = Date.now() - validSession.createdAt;
        const remainingMins = Math.max(1, Math.ceil((ONE_HOUR_MS - elapsed) / 60000));
        setSessionTimeLeft(remainingMins);
      } else {
        // Session expired while browsing
        setCustomer(null);
        setIsCustomerModalOpen(true);
        setFormError('Your previous 1-hour dining session has expired. Please confirm your details to continue.');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [customer, checkStoredSession]);

  // Initial load: Validate Table QR & Load Menu
  useEffect(() => {
    async function initTableAndMenu() {
      if (!restaurantId) {
        setError('Invalid dining link. Missing restaurant identifier.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // Step 1: Verify Table QR validity
        try {
          const verifyRes = await verifyPublicTableApi(restaurantId, tableNumber || '1');
          if (verifyRes.valid) {
            setTableData(verifyRes.table);
          }
        } catch (tableErr) {
          setError(
            tableErr.message ||
              `Table ${tableNumber || '1'} could not be verified. Please ensure you scanned the correct QR code on your table.`
          );
          setLoading(false);
          return;
        }

        // Step 2: Fetch Public Menu
        const menuRes = await getPublicMenuApi(restaurantId);
        setRestaurant(menuRes.restaurant);
        setMenuItems(menuRes.data || []);

        // Step 3: Check 1-Hour Customer Session in localStorage
        const existingSession = checkStoredSession();
        if (existingSession) {
          // Session active within 1 hour! Auto-resume without prompting for name/phone
          setCustomer(existingSession);
          setCustomerForm({
            name: existingSession.customerName || '',
            phone: existingSession.customerPhone || '',
          });
          setIsCustomerModalOpen(false);
          setSessionResumedNotice(true);
          setTimeout(() => setSessionResumedNotice(false), 5000);
        } else {
          // No active session or expired > 1 hr: prompt customer for name & phone
          setCustomer(null);
          setIsCustomerModalOpen(true);
        }
      } catch (err) {
        setError(err.message || 'Unable to load menu. Please ask your server.');
      } finally {
        setLoading(false);
      }
    }

    initTableAndMenu();
  }, [restaurantId, tableNumber, checkStoredSession]);

  // Handle Customer Form Submit (Name & Mobile)
  const handleCustomerSubmit = (e) => {
    e.preventDefault();
    const { name, phone } = customerForm;

    if (!name.trim() || name.trim().length < 2) {
      setFormError('Please enter your full name (at least 2 characters).');
      return;
    }

    const cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      setFormError('Please enter a valid mobile number (at least 7 digits).');
      return;
    }

    const sessionPayload = {
      customerName: name.trim(),
      customerPhone: phone.trim(),
      restaurantId,
      tableNumber: tableNumber || '1',
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };

    const key = getSessionKey(restaurantId, tableNumber);
    localStorage.setItem(key, JSON.stringify(sessionPayload));

    setCustomer(sessionPayload);
    setSessionTimeLeft(60);
    setFormError('');
    setIsCustomerModalOpen(false);
  };

  // Cart operations
  const handleAddToCart = (itemId) => {
    // If no active session, ask customer to enter name/phone first
    if (!customer) {
      setIsCustomerModalOpen(true);
      return;
    }
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

  // Quick chip click handler for remarks
  const handleAppendRemark = (chipText) => {
    const cleanChip = chipText.replace(/^[^\w\s]+/, '').trim();
    if (!kitchenNotes.trim()) {
      setKitchenNotes(cleanChip);
    } else if (!kitchenNotes.toLowerCase().includes(cleanChip.toLowerCase())) {
      setKitchenNotes((prev) => `${prev.trim()}, ${cleanChip}`);
    }
  };

  // Place order for table
  const handlePlaceOrder = async () => {
    if (cartItemsList.length === 0) return;

    // Check customer session validity before placing order
    let activeCustomer = customer;
    if (!activeCustomer) {
      const stored = checkStoredSession();
      if (stored) {
        activeCustomer = stored;
        setCustomer(stored);
      } else {
        setIsCustomerModalOpen(true);
        setFormError('Please enter your name and phone number before placing the order.');
        return;
      }
    }

    try {
      setPlacingOrder(true);
      const orderPayload = {
        restaurantId,
        tableNumber: String(tableNumber || '1').trim(),
        customerName: activeCustomer.customerName,
        customerPhone: activeCustomer.customerPhone,
        items: cartItemsList.map((item) => ({
          menuItem: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
        })),
        totalAmount,
        notes: kitchenNotes.trim(),
      };

      const result = await placeTableOrderApi(orderPayload);

      // Update session lastActiveAt in localStorage
      const key = getSessionKey(restaurantId, tableNumber);
      const updatedSession = { ...activeCustomer, lastActiveAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(updatedSession));
      setCustomer(updatedSession);

      setPlacedOrder({
        ...result,
        customerName: activeCustomer.customerName,
        remarks: kitchenNotes.trim(),
      });
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
    setTimeout(() => setCallWaiterNotice(false), 4500);
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
          <h2>Verifying Table QR</h2>
          <p>Connecting to {tableNumber ? `Table ${tableNumber}` : 'your table'}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="guest-view-container">
        <div className="guest-error-box">
          <AlertCircle size={44} color="#dc2626" />
          <h2>Invalid Table QR Code</h2>
          <p>{error}</p>
          <div className="guest-error-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={15} />
              <span>Retry Verification</span>
            </button>
            {onBackToAdmin && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onBackToAdmin}
              >
                <ArrowLeft size={15} />
                <span>Return to Admin</span>
              </button>
            )}
          </div>
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
              <div className="guest-badges-row">
                <span className="guest-table-badge">
                  <MapPin size={12} />
                  <span>Table {tableNumber || '1'}{tableData?.capacity ? ` • ${tableData.capacity} Seats` : ''}</span>
                </span>
                {customer && (
                  <span
                    className="guest-session-badge"
                    onClick={() => setIsCustomerModalOpen(true)}
                    title="Click to edit your details"
                  >
                    <User size={12} />
                    <span className="session-name">{customer.customerName}</span>
                    <span className="session-timer">
                      <Clock size={10} /> {sessionTimeLeft}m
                    </span>
                    <Edit3 size={11} className="edit-icon" />
                  </span>
                )}
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

      {/* 1-Hour Session Resumed Alert Banner */}
      {sessionResumedNotice && customer && (
        <div className="guest-session-toast">
          <CheckCircle2 size={18} color="#15803d" />
          <div className="toast-text">
            <strong>Welcome back, {customer.customerName}!</strong>
            <span> Dining session resumed for <strong>Table {tableNumber}</strong> ({sessionTimeLeft} mins remaining). Place additional orders anytime!</span>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => setSessionResumedNotice(false)}
          >
            <X size={15} />
          </button>
        </div>
      )}

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
            <CheckCircle2 size={26} color="#15803d" />
          </div>
          <div className="success-content">
            <div className="success-title">Order Sent to Kitchen!</div>
            <div className="success-desc">
              Your order for <strong>Table {tableNumber}</strong> has been received. Thank you, <strong>{placedOrder.customerName || customer?.customerName}</strong>!
            </div>
            {placedOrder.remarks && (
              <div className="success-remarks-note">
                <strong>Special Remarks:</strong> "{placedOrder.remarks}"
              </div>
            )}
            <div className="success-session-hint">
              <Clock size={12} />
              <span>Session active for {sessionTimeLeft} mins. Want more items? Browse the menu below and send another order!</span>
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

      {/* Sub Bar Welcome */}
      <div className="guest-sub-bar">
        <span>
          🍽️ Welcome {customer ? <strong>{customer.customerName}</strong> : 'Guest'}! Browse the contactless menu for <strong>Table {tableNumber || '1'}</strong>.
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

      {/* Floating Bottom Cart Bar */}
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

      {/* Customer Onboarding / Details Modal */}
      {isCustomerModalOpen && (
        <div className="modal-backdrop customer-modal-backdrop">
          <div className="modal-card customer-onboarding-modal">
            <div className="customer-modal-header">
              <div className="modal-icon-badge">
                <UtensilsCrossed size={22} />
              </div>
              <div>
                <h2>{customer ? 'Update Your Details' : `Welcome to Table ${tableNumber || '1'}!`}</h2>
                <p className="customer-modal-desc">
                  Please provide your name & mobile number once. Your session stays active for{' '}
                  <strong>1 hour</strong>, so you can order additional items anytime without entering details again.
                </p>
              </div>
              {customer && (
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsCustomerModalOpen(false)}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {formError && (
              <div className="modal-error-notice">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCustomerSubmit} className="customer-form">
              <div className="form-group">
                <label className="form-label">
                  <User size={14} /> Your Full Name *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rahul Sharma"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={14} /> Mobile Number *
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  required
                />
                <span className="form-help-text">
                  Used by the restaurant team to identify your order tickets and updates.
                </span>
              </div>

              <div className="customer-modal-footer">
                <button type="submit" className="btn btn-primary btn-block">
                  <Check size={16} />
                  <span>{customer ? 'Save & Return to Menu' : 'Start Dining & View Menu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Sheet: Table Order Review with Customer Remarks */}
      {isOrderSheetOpen && (
        <div className="modal-backdrop">
          <div className="modal-card guest-order-modal">
            <div className="modal-header">
              <div>
                <h2>Table {tableNumber || '1'} Order Summary</h2>
                <div className="guest-order-customer-line">
                  <User size={13} />
                  <span>
                    <strong>{customer?.customerName || 'Guest'}</strong>
                    {customer?.customerPhone && ` • ${customer.customerPhone}`}
                  </span>
                  <button
                    type="button"
                    className="customer-edit-link"
                    onClick={() => {
                      setIsOrderSheetOpen(false);
                      setIsCustomerModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                </div>
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

            {/* Customer Remarks / Chef Special Instructions */}
            <div className="form-group remarks-form-group">
              <label className="form-label remarks-label">
                <ChefHat size={15} />
                <span>Special Remarks & Instructions for Chef</span>
              </label>
              <textarea
                className="form-input form-textarea remarks-textarea"
                placeholder="e.g. Make it spicy, less salt, extra napkins, no onions in pasta..."
                value={kitchenNotes}
                onChange={(e) => setKitchenNotes(e.target.value)}
                rows={2}
              />

              {/* Quick Suggestion Chips */}
              <div className="remarks-chips-row">
                {quickRemarks.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="remark-chip-btn"
                    onClick={() => handleAppendRemark(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="cart-totals-summary">
              <div className="summary-row">
                <span>Table</span>
                <strong>Table {tableNumber || '1'}</strong>
              </div>
              <div className="summary-row">
                <span>Diner</span>
                <span>{customer?.customerName || 'Guest'}</span>
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
