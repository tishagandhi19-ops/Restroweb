import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  UtensilsCrossed,
  Layers,
  QrCode,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Printer,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Search,
  Users,
  User,
  Phone,
  Eye,
  Loader2,
  Sparkles,
  ShoppingBag,
  Clock,
  Calendar,
  ChevronRight,
  Wifi,
} from 'lucide-react';
import {
  getMenuItemsApi,
  createMenuItemApi,
  updateMenuItemApi,
  deleteMenuItemApi,
} from '../api/menu';
import {
  getTablesApi,
  createTableApi,
  createBulkTablesApi,
  updateTableApi,
  deleteTableApi,
} from '../api/tables';
import {
  getRestaurantOrdersApi,
  updateOrderStatusApi,
} from '../api/orders';
import {
  getSocket,
  joinRestaurantRoom,
  leaveRestaurantRoom,
} from '../api/socket';

export default function AdminDashboard({ admin, onLogout, onPreviewGuest }) {
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'tables' | 'orders'
  const token = localStorage.getItem('restoweb_admin_token') || admin.token;

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const showNotification = useCallback((msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  }, []);

  // Menu State
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('All');
  const [menuSearch, setMenuSearch] = useState('');

  // Menu Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    category: 'Main Course',
    price: '',
    description: '',
    isAvailable: true,
  });
  const [savingItem, setSavingItem] = useState(false);

  // Table State
  const [tables, setTables] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);

  // Table Modals
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [newTableData, setNewTableData] = useState({ tableNumber: '', capacity: 4 });
  const [bulkData, setBulkData] = useState({ start: 1, count: 5, capacity: 4, prefix: 'Table' });
  const [tableActionLoading, setTableActionLoading] = useState(false);

  // Print/Inspect QR Modal
  const [printTable, setPrintTable] = useState(null);

  // Live Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderDateFilter, setOrderDateFilter] = useState('today'); // 'today' | 'all'
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [printReceiptOrder, setPrintReceiptOrder] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const restaurantId = admin?._id || admin?.id;

  // Synthesize a pleasant chime alert using Web Audio API when a new order arrives
  const playOrderAlertSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: 880Hz (A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Tone 2: 1174.66Hz (D6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, now + 0.15);
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio alert could not play:', e);
    }
  }, []);

  // Default Categories
  const defaultCategories = ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Sides'];

  // Load Menu
  const loadMenu = async () => {
    try {
      setMenuLoading(true);
      const items = await getMenuItemsApi(token);
      setMenuItems(items);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load menu items.');
    } finally {
      setMenuLoading(false);
    }
  };

  // Load Tables
  const loadTables = async () => {
    try {
      setTablesLoading(true);
      const tableList = await getTablesApi(token);
      setTables(tableList);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load restaurant tables.');
    } finally {
      setTablesLoading(false);
    }
  };

  // Load Orders
  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const ordersList = await getRestaurantOrdersApi(token);
      setOrders(ordersList || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
    loadTables();
    loadOrders();

    if (!restaurantId) return;

    // Connect to Socket.io for Real-Time Instant Order Streaming
    const socket = getSocket();
    joinRestaurantRoom(restaurantId);

    const handleConnect = () => {
      setSocketConnected(true);
      joinRestaurantRoom(restaurantId);
      // Re-fetch orders on reconnection to ensure consistency
      loadOrders();
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleNewOrder = (newOrder) => {
      if (!newOrder) return;
      // Prepend incoming order instantly
      setOrders((prev) => [newOrder, ...prev.filter((o) => o._id !== newOrder._id)]);
      // Play audio chime
      playOrderAlertSound();
      // Show notification banner
      showNotification(
        `🔔 New order received from Table ${newOrder.tableNumber}! (${newOrder.items?.length || 0} items - $${Number(newOrder.totalAmount || 0).toFixed(2)})`
      );
    };

    const handleOrderStatusUpdated = (updatedOrder) => {
      if (!updatedOrder) return;
      setOrders((prev) => prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)));
    };

    if (socket.connected) {
      setSocketConnected(true);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusUpdated', handleOrderStatusUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('newOrder', handleNewOrder);
      socket.off('orderStatusUpdated', handleOrderStatusUpdated);
      leaveRestaurantRoom(restaurantId);
    };
  }, [restaurantId, playOrderAlertSound, showNotification]);

  // Menu Handlers
  const handleOpenAddMenu = () => {
    setEditingItem(null);
    setMenuForm({
      name: '',
      category: 'Main Course',
      price: '',
      description: '',
      isAvailable: true,
    });
    setIsMenuModalOpen(true);
  };

  const handleOpenEditMenu = (item) => {
    setEditingItem(item);
    setMenuForm({
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || '',
      isAvailable: item.isAvailable,
    });
    setIsMenuModalOpen(true);
  };

  const handleSaveMenuItem = async (e) => {
    e.preventDefault();
    if (!menuForm.name.trim() || !menuForm.price) {
      showNotification('Please provide item name and price.', true);
      return;
    }

    try {
      setSavingItem(true);
      if (editingItem) {
        const updated = await updateMenuItemApi(token, editingItem._id, menuForm);
        setMenuItems((prev) => prev.map((it) => (it._id === editingItem._id ? updated : it)));
        showNotification(`Updated "${updated.name}" successfully!`);
      } else {
        const created = await createMenuItemApi(token, menuForm);
        setMenuItems((prev) => [created, ...prev]);
        showNotification(`Added "${created.name}" to menu!`);
      }
      setIsMenuModalOpen(false);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setSavingItem(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      const updated = await updateMenuItemApi(token, item._id, {
        isAvailable: !item.isAvailable,
      });
      setMenuItems((prev) => prev.map((it) => (it._id === item._id ? updated : it)));
      showNotification(`"${item.name}" is now ${updated.isAvailable ? 'In Stock' : 'Out of Stock'}.`);
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteMenuItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from your menu?`)) return;
    try {
      await deleteMenuItemApi(token, id);
      setMenuItems((prev) => prev.filter((it) => it._id !== id));
      showNotification(`Removed "${name}" from menu.`);
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // Table Handlers
  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTableData.tableNumber.trim()) {
      showNotification('Table number is required.', true);
      return;
    }

    try {
      setTableActionLoading(true);
      const created = await createTableApi(token, newTableData);
      setTables((prev) => [...prev, created]);
      showNotification(`Created ${created.tableNumber} successfully!`);
      setIsAddTableModalOpen(false);
      setNewTableData({ tableNumber: '', capacity: 4 });
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setTableActionLoading(false);
    }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    try {
      setTableActionLoading(true);
      const created = await createBulkTablesApi(token, bulkData);
      setTables((prev) => [...prev, ...created]);
      showNotification(`Generated ${created.length} tables with unique QR codes!`);
      setIsBulkModalOpen(false);
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setTableActionLoading(false);
    }
  };

  const handleDeleteTable = async (id, tableNumber) => {
    if (!window.confirm(`Delete ${tableNumber} and deactivate its QR code?`)) return;
    try {
      await deleteTableApi(token, id);
      setTables((prev) => prev.filter((t) => t._id !== id));
      showNotification(`Deleted ${tableNumber}.`);
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const updated = await updateOrderStatusApi(token, orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
      showNotification(`Order status updated to ${newStatus}.`);
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const isOrderFromToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const filteredOrders = orders.filter((order) => {
    // 1. Date filter (today vs all)
    if (orderDateFilter === 'today' && !isOrderFromToday(order.createdAt)) {
      return false;
    }

    // 2. Status filter
    if (orderStatusFilter !== 'all') {
      if (orderStatusFilter === 'active') {
        if (order.status === 'Served' || order.status === 'Completed' || order.status === 'Cancelled') {
          return false;
        }
      } else if (order.status?.toLowerCase() !== orderStatusFilter.toLowerCase()) {
        return false;
      }
    }

    // 3. Search query: Name, Phone, Table Number, or Order ID
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.trim().toLowerCase();
      const matchName = (order.customerName || '').toLowerCase().includes(q);
      const matchPhone = (order.customerPhone || '').toLowerCase().includes(q);
      const matchTable = (order.tableNumber || '').toLowerCase().includes(q);
      const matchId = (order._id || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchTable || matchId;
    }

    return true;
  });

  const getTableDiningUrl = (tableNumber) => {
    const origin = window.location.origin;
    return `${origin}/?restaurantId=${admin._id}&table=${encodeURIComponent(tableNumber)}`;
  };

  // Quick Starter Menu Generator if menu is empty
  const handleAddSampleDishes = async () => {
    const samples = [
      { name: 'Truffle Bruschetta', category: 'Starters', price: 12.5, description: 'Grilled artisan sourdough, wild forest mushrooms, white truffle oil & aged parmesan.' },
      { name: 'Pan-Seared Sea Bass', category: 'Main Course', price: 28.0, description: 'Served on a bed of asparagus, charred leeks and champagne beurre blanc.' },
      { name: 'Signature Wagyu Burger', category: 'Main Course', price: 22.0, description: 'Brioche bun, smoked gruyere, caramelized shallots, hand-cut rosemary fries.' },
      { name: 'Sparkling Basil Lemonade', category: 'Beverages', price: 6.5, description: 'Fresh squeezed Amalfi lemons, garden basil syrup, sparkling soda.' },
      { name: 'Dark Chocolate Fondant', category: 'Desserts', price: 10.0, description: 'Warm molten lava cake with Madagascar vanilla bean gelato.' },
    ];

    try {
      setMenuLoading(true);
      for (const item of samples) {
        await createMenuItemApi(token, item);
      }
      await loadMenu();
      showNotification('Added sample menu items to get you started!');
    } catch (err) {
      showNotification(err.message, true);
    } finally {
      setMenuLoading(false);
    }
  };

  // Category list from items + defaults
  const categories = ['All', ...new Set([...defaultCategories, ...menuItems.map((i) => i.category)])];

  const filteredMenuItems = menuItems.filter((item) => {
    const matchCat = menuCategoryFilter === 'All' || item.category === menuCategoryFilter;
    const matchSearch =
      item.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(menuSearch.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="admin-app-layout">
      {/* Top Navbar */}
      <header className="admin-topbar">
        <div className="topbar-inner">
          <div className="topbar-brand">
            <div className="brand-icon small">
              <UtensilsCrossed size={18} />
            </div>
            <div>
              <span className="brand-logo-text">RestoWeb</span>
              <span className="restaurant-badge">{admin.restaurantName}</span>
            </div>
          </div>

          <div className="topbar-nav">
            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
              onClick={() => setActiveTab('menu')}
            >
              <Layers size={17} />
              <span>Menu Items</span>
              <span className="count-pill">{menuItems.length}</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
              onClick={() => setActiveTab('tables')}
            >
              <QrCode size={17} />
              <span>Tables & QR Codes</span>
              <span className="count-pill">{tables.length}</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('orders');
                loadOrders();
              }}
            >
              <ShoppingBag size={17} />
              <span>Live Orders</span>
              {orders.length > 0 && <span className="count-pill highlight">{orders.length}</span>}
            </button>
          </div>

          <div className="topbar-user">
            <span className="user-greeting">
              Admin: <strong>{admin.name}</strong>
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              title="Sign Out"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notifications */}
      {errorMsg && (
        <div className="floating-toast toast-error">
          <AlertCircle size={17} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="floating-toast toast-success">
          <CheckCircle2 size={17} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="admin-main-container">
        {activeTab === 'menu' && (
          /* ========================================================
             MENU MANAGEMENT SECTION
             ======================================================== */
          <div className="section-block">
            <div className="section-header">
              <div>
                <h1 className="section-title">Menu Items</h1>
                <p className="section-subtitle">
                  Create, edit, and organize dishes and drinks shown on your contactless table menus.
                </p>
              </div>

              <div className="section-actions">
                {menuItems.length === 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAddSampleDishes}
                    disabled={menuLoading}
                  >
                    <Sparkles size={16} />
                    <span>Load Sample Menu</span>
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={handleOpenAddMenu}>
                  <Plus size={16} />
                  <span>Add Menu Item</span>
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="filters-bar">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search dishes by name or description..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="categories-pill-row">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cat-filter-btn ${menuCategoryFilter === cat ? 'active' : ''}`}
                    onClick={() => setMenuCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            {menuLoading ? (
              <div className="loading-state">
                <Loader2 size={28} className="spinner" />
                <span>Loading restaurant menu...</span>
              </div>
            ) : filteredMenuItems.length === 0 ? (
              <div className="empty-state-card">
                <UtensilsCrossed size={40} opacity={0.35} />
                <h3>No Menu Items Found</h3>
                <p>
                  {menuSearch || menuCategoryFilter !== 'All'
                    ? 'No dishes match your active filter.'
                    : 'Start crafting your restaurant menu by adding your first dish or beverage.'}
                </p>
                <button type="button" className="btn btn-primary" onClick={handleOpenAddMenu}>
                  <Plus size={16} /> Add First Item
                </button>
              </div>
            ) : (
              <div className="menu-grid">
                {filteredMenuItems.map((item) => (
                  <div
                    key={item._id}
                    className={`menu-item-card ${!item.isAvailable ? 'out-of-stock' : ''}`}
                  >
                    <div className="item-card-header">
                      <span className="item-category-tag">{item.category}</span>
                      <span className="item-price">${Number(item.price).toFixed(2)}</span>
                    </div>

                    <h3 className="item-name">{item.name}</h3>
                    {item.description && <p className="item-desc">{item.description}</p>}

                    <div className="item-card-footer">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(item)}
                        className={`stock-toggle-btn ${item.isAvailable ? 'in-stock' : 'sold-out'}`}
                        title="Click to toggle availability"
                      >
                        {item.isAvailable ? (
                          <>
                            <span className="stock-dot in" /> In Stock
                          </>
                        ) : (
                          <>
                            <span className="stock-dot out" /> Sold Out
                          </>
                        )}
                      </button>

                      <div className="item-actions">
                        <button
                          type="button"
                          className="icon-action-btn"
                          onClick={() => handleOpenEditMenu(item)}
                          title="Edit Item"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-action-btn delete"
                          onClick={() => handleDeleteMenuItem(item._id, item.name)}
                          title="Delete Item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tables' && (
          /* ========================================================
             TABLES & QR CODES MANAGEMENT SECTION
             ======================================================== */
          <div className="section-block">
            <div className="section-header">
              <div>
                <h1 className="section-title">Dining Tables & QR Codes</h1>
                <p className="section-subtitle">
                  Generate dedicated QR codes for each table. Guests scan with their phone to view the
                  live menu for that exact table.
                </p>
              </div>

              <div className="section-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsBulkModalOpen(true)}
                >
                  <Sparkles size={16} />
                  <span>Quick Add Multiple</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsAddTableModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>Add Single Table</span>
                </button>
              </div>
            </div>

            {tablesLoading ? (
              <div className="loading-state">
                <Loader2 size={28} className="spinner" />
                <span>Loading dining tables...</span>
              </div>
            ) : tables.length === 0 ? (
              <div className="empty-state-card">
                <QrCode size={44} opacity={0.35} />
                <h3>No Dining Tables Configured</h3>
                <p>
                  Add your restaurant tables to automatically generate scannable table QR codes for
                  your diners.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setIsBulkModalOpen(true)}
                  >
                    Generate Tables 1 to 5
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsAddTableModalOpen(true)}
                  >
                    Add Custom Table
                  </button>
                </div>
              </div>
            ) : (
              <div className="tables-grid">
                {tables.map((table) => {
                  const diningUrl = getTableDiningUrl(table.tableNumber);

                  return (
                    <div key={table._id} className="table-card">
                      <div className="table-card-top">
                        <div className="table-title-wrap">
                          <h3 className="table-number">{table.tableNumber}</h3>
                          <span className="table-capacity">
                            <Users size={13} /> {table.capacity} Seats
                          </span>
                        </div>
                        <button
                          type="button"
                          className="icon-action-btn delete"
                          onClick={() => handleDeleteTable(table._id, table.tableNumber)}
                          title="Delete Table"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Scannable QR Code */}
                      <div className="table-qr-container">
                        <div className="qr-box">
                          <QRCodeSVG
                            value={diningUrl}
                            size={135}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                        <span className="qr-caption">Scan to order from this table</span>
                      </div>

                      {/* Table Actions */}
                      <div className="table-card-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPrintTable(table)}
                          title="Print or view table tent stand card"
                        >
                          <Printer size={14} />
                          <span>Print Stand</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onPreviewGuest(table.tableNumber)}
                          title="Preview guest dining view on this table"
                        >
                          <Eye size={14} />
                          <span>Guest View</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          /* ========================================================
             LIVE TABLE ORDERS SECTION
             ======================================================== */
          <div className="section-block">
            <div className="section-header">
              <div>
                <h1 className="section-title">Live Table Orders</h1>
                <p className="section-subtitle">
                  Orders placed in real-time by guests seated at your dining tables after scanning their QR code.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: socketConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    color: socketConnected ? '#10b981' : '#f59e0b',
                    border: `1px solid ${socketConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  }}>
                    <span style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: socketConnected ? '#10b981' : '#f59e0b',
                      boxShadow: socketConnected ? '0 0 8px #10b981' : 'none'
                    }} />
                    {socketConnected ? '⚡ Live Real-Time Active (Socket.io)' : 'Connecting Real-Time...'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadOrders}
                disabled={ordersLoading}
              >
                <Loader2 size={14} className={ordersLoading ? 'spinner' : ''} />
                <span>Refresh Orders</span>
              </button>
            </div>

            {/* Live Orders Search & Filters Bar */}
            <div className="orders-filters-bar">
              <div className="orders-search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="orders-search-input"
                  placeholder="Search today's orders by customer name, phone, or table..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                />
                {orderSearchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setOrderSearchQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="orders-filter-controls">
                {/* Date Filter: Today vs All */}
                <div className="orders-date-toggle">
                  <button
                    type="button"
                    className={`toggle-btn ${orderDateFilter === 'today' ? 'active' : ''}`}
                    onClick={() => setOrderDateFilter('today')}
                  >
                    <Calendar size={13} />
                    <span>Today ({orders.filter((o) => isOrderFromToday(o.createdAt)).length})</span>
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${orderDateFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setOrderDateFilter('all')}
                  >
                    <span>All Time ({orders.length})</span>
                  </button>
                </div>

                {/* Status Filter Pills */}
                <div className="orders-status-pills">
                  {['all', 'active', 'received', 'preparing', 'ready', 'served'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`status-filter-pill ${orderStatusFilter === st ? 'active' : ''}`}
                      onClick={() => setOrderStatusFilter(st)}
                    >
                      {st === 'all' ? 'All Status' : st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {ordersLoading && orders.length === 0 ? (
              <div className="loading-state">
                <Loader2 size={28} className="spinner" />
                <span>Checking incoming orders...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state-card">
                <ShoppingBag size={44} opacity={0.35} />
                <h3>No Orders Matching Filter</h3>
                <p>
                  {orderSearchQuery || orderDateFilter === 'today'
                    ? 'No orders found matching your search or date criteria. Try searching for a different name/phone or switch to "All Time".'
                    : 'When guests scan their table\'s QR code and tap "Send Order", tickets will appear here instantly.'}
                </p>
                {(orderSearchQuery || orderStatusFilter !== 'all' || orderDateFilter !== 'today') && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setOrderSearchQuery('');
                      setOrderStatusFilter('all');
                      setOrderDateFilter('today');
                    }}
                    style={{ marginTop: '10px' }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="orders-grid">
                {filteredOrders.map((order) => (
                  <div key={order._id} className="order-ticket-card">
                    <div className="order-ticket-header">
                      <div>
                        <span className="order-table-badge">Table {order.tableNumber}</span>
                        <div className="order-time">
                          <Clock size={12} />
                          <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="order-date-text">
                            • {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className={`order-status-pill status-${order.status.toLowerCase()}`}>
                        {order.status}
                      </div>
                    </div>

                    {/* Customer Contact Details */}
                    <div className="order-customer-banner">
                      <div className="order-customer-field">
                        <User size={13} className="field-icon" />
                        <span className="customer-name">{order.customerName || 'Guest Diner'}</span>
                      </div>
                      {order.customerPhone && (
                        <div className="order-customer-field">
                          <Phone size={12} className="field-icon" />
                          <span className="customer-phone">{order.customerPhone}</span>
                        </div>
                      )}
                    </div>

                    <div className="order-items-list">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="order-item-line">
                          <span className="order-item-qty">{item.quantity}x</span>
                          <span className="order-item-name">{item.name}</span>
                          <span className="order-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="order-notes-box">
                        <strong>Customer Remarks:</strong> {order.notes}
                      </div>
                    )}

                    <div className="order-ticket-footer">
                      <div className="order-total-amount">
                        <span>Total:</span>
                        <strong>${Number(order.totalAmount || 0).toFixed(2)}</strong>
                      </div>

                      <div className="order-card-action-buttons">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm btn-print-receipt"
                          onClick={() => setPrintReceiptOrder(order)}
                          title="Print thermal receipt or bill voucher"
                        >
                          <Printer size={13} />
                          <span>Print Bill</span>
                        </button>

                        <div className="order-status-actions">
                          {order.status === 'Received' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleUpdateOrderStatus(order._id, 'Preparing')}
                            >
                              Mark Preparing
                            </button>
                          )}
                          {order.status === 'Preparing' && (
                            <button
                              type="button"
                              className="btn btn-purple btn-sm"
                              onClick={() => handleUpdateOrderStatus(order._id, 'Ready')}
                            >
                              Mark Ready
                            </button>
                          )}
                          {order.status === 'Ready' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateOrderStatus(order._id, 'Served')}
                            >
                              Mark Served
                            </button>
                          )}
                          {order.status === 'Served' && (
                            <span className="order-completed-label">
                              <CheckCircle2 size={14} color="#15803d" /> Served
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================
          MODAL: ADD / EDIT MENU ITEM
          ======================================================== */}
      {isMenuModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsMenuModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="modal-form">
              <div className="form-group">
                <label className="form-label">Dish / Drink Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Grilled Ribeye Steak"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                  >
                    <option value="Starters">Starters / Appetizers</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages / Cocktails</option>
                    <option value="Sides">Sides & Salads</option>
                    <option value="Chef Specials">Chef Specials</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="19.50"
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-input form-textarea"
                  placeholder="Fresh ingredients, prep style, or dietary notes..."
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="checkbox-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={menuForm.isAvailable}
                    onChange={(e) => setMenuForm({ ...menuForm, isAvailable: e.target.checked })}
                  />
                  <span>Currently Available (In Stock for Orders)</span>
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsMenuModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingItem}>
                  {savingItem ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Saving...
                    </>
                  ) : (
                    <span>{editingItem ? 'Save Changes' : 'Create Item'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD SINGLE TABLE
          ======================================================== */}
      {isAddTableModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Add Dining Table</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddTableModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="modal-form">
              <div className="form-group">
                <label className="form-label">Table Number or Label</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Table 1, T-4, or Patio 2"
                  value={newTableData.tableNumber}
                  onChange={(e) =>
                    setNewTableData({ ...newTableData, tableNumber: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Seating Capacity (Guests)</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="form-input"
                  value={newTableData.capacity}
                  onChange={(e) =>
                    setNewTableData({ ...newTableData, capacity: e.target.value })
                  }
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddTableModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={tableActionLoading}>
                  {tableActionLoading ? 'Creating...' : 'Create Table & QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: BULK GENERATE TABLES
          ======================================================== */}
      {isBulkModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Bulk Generate Dining Tables</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsBulkModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBulkGenerate} className="modal-form">
              <p className="modal-hint">
                Quickly generate multiple tables with instant unique QR codes in sequence.
              </p>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Prefix</label>
                  <input
                    type="text"
                    className="form-input"
                    value={bulkData.prefix}
                    onChange={(e) => setBulkData({ ...bulkData, prefix: e.target.value })}
                    placeholder="Table"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Start Number</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={bulkData.start}
                    onChange={(e) => setBulkData({ ...bulkData, start: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">How Many Tables?</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    className="form-input"
                    value={bulkData.count}
                    onChange={(e) => setBulkData({ ...bulkData, count: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Seats per Table</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={bulkData.capacity}
                    onChange={(e) => setBulkData({ ...bulkData, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsBulkModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={tableActionLoading}>
                  {tableActionLoading ? 'Generating...' : `Generate ${bulkData.count} Tables`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PRINT / TABLE TENT STAND PREVIEW
          ======================================================== */}
      {printTable && (
        <div className="modal-backdrop">
          <div className="modal-card print-card-modal">
            <div className="modal-header">
              <h2>Table QR Card</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setPrintTable(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Table Tent Design */}
            <div className="table-tent-card" id="printable-table-tent">
              <div className="tent-header">
                <div className="tent-resto-name">{admin.restaurantName}</div>
                <div className="tent-tag">Digital Dining & Contactless Ordering</div>
              </div>

              <div className="tent-qr-box">
                <QRCodeSVG
                  value={getTableDiningUrl(printTable.tableNumber)}
                  size={190}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="tent-table-badge">{printTable.tableNumber}</div>

              <div className="tent-instructions">
                <p>1. Open your phone camera</p>
                <p>2. Scan this QR code to view our digital menu</p>
                <p>3. Order and enjoy your meal!</p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPrintTable(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
              >
                <Printer size={16} />
                <span>Print Stand</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PRINT ORDER RECEIPT / BILL VOUCHER
          ======================================================== */}
      {printReceiptOrder && (
        <div className="modal-backdrop receipt-modal-backdrop">
          <div className="modal-card receipt-modal-card">
            <div className="receipt-modal-actions no-print">
              <div className="receipt-modal-title">
                <Printer size={18} />
                <span>Order Receipt Voucher</span>
              </div>
              <div className="receipt-btn-group">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.print()}
                >
                  <Printer size={14} />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setPrintReceiptOrder(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Receipt Thermal Paper Design */}
            <div className="receipt-paper" id="printable-receipt">
              <div className="receipt-header">
                <h2 className="receipt-resto-name">{admin.restaurantName}</h2>
                <div className="receipt-subtitle">Guest Dining Receipt / Tax Invoice</div>
                <div className="receipt-divider-dashed" />
              </div>

              <div className="receipt-meta">
                <div className="receipt-meta-row">
                  <span>Table:</span>
                  <strong>Table {printReceiptOrder.tableNumber}</strong>
                </div>
                <div className="receipt-meta-row">
                  <span>Order ID:</span>
                  <span>#{printReceiptOrder._id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Date & Time:</span>
                  <span>
                    {new Date(printReceiptOrder.createdAt).toLocaleDateString()}{' '}
                    {new Date(printReceiptOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="receipt-meta-row">
                  <span>Customer:</span>
                  <strong>{printReceiptOrder.customerName || 'Guest Diner'}</strong>
                </div>
                {printReceiptOrder.customerPhone && (
                  <div className="receipt-meta-row">
                    <span>Phone:</span>
                    <span>{printReceiptOrder.customerPhone}</span>
                  </div>
                )}
                <div className="receipt-meta-row">
                  <span>Status:</span>
                  <span className={`receipt-status-tag status-${printReceiptOrder.status.toLowerCase()}`}>
                    {printReceiptOrder.status}
                  </span>
                </div>
              </div>

              <div className="receipt-divider-dashed" />

              {/* Items Table */}
              <div className="receipt-items-table">
                <div className="receipt-item-header">
                  <span className="col-qty">Qty</span>
                  <span className="col-item">Item</span>
                  <span className="col-price">Price</span>
                  <span className="col-total">Total</span>
                </div>
                <div className="receipt-divider-solid" />
                {printReceiptOrder.items?.map((it, idx) => (
                  <div key={idx} className="receipt-item-line">
                    <span className="col-qty">{it.quantity}x</span>
                    <span className="col-item">{it.name}</span>
                    <span className="col-price">${Number(it.price).toFixed(2)}</span>
                    <span className="col-total">
                      ${(Number(it.price) * Number(it.quantity)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="receipt-divider-dashed" />

              {/* Totals */}
              <div className="receipt-totals">
                <div className="receipt-total-row">
                  <span>Subtotal:</span>
                  <span>${Number(printReceiptOrder.totalAmount || 0).toFixed(2)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>Tax & Service:</span>
                  <span>$0.00</span>
                </div>
                <div className="receipt-divider-solid" />
                <div className="receipt-total-row grand-total">
                  <span>Grand Total:</span>
                  <strong>${Number(printReceiptOrder.totalAmount || 0).toFixed(2)}</strong>
                </div>
              </div>

              {printReceiptOrder.notes && (
                <>
                  <div className="receipt-divider-dashed" />
                  <div className="receipt-notes">
                    <strong>Kitchen Remarks:</strong> "{printReceiptOrder.notes}"
                  </div>
                </>
              )}

              <div className="receipt-divider-dashed" />
              <div className="receipt-footer">
                <p>Thank you for dining with us!</p>
                <p className="receipt-footer-sub">Please visit {admin.restaurantName} again.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
