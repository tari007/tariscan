"use client";

import Link from "next/link";
import { OfflineSyncStatus } from "@/components/offline-sync-status";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Package,
  Plus,
  Receipt,
  ScanBarcode,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  Wallet
} from "lucide-react";

const transactions = [
  {
    id: "TS-10245",
    customer: "Walk-in Customer",
    time: "10:42 AM",
    amount: "₦85,500",
    status: "Completed"
  },
  {
    id: "TS-10244",
    customer: "Grace Okafor",
    time: "10:25 AM",
    amount: "₦32,000",
    status: "Completed"
  },
  {
    id: "TS-10243",
    customer: "Walk-in Customer",
    time: "09:58 AM",
    amount: "₦14,750",
    status: "Completed"
  },
  {
    id: "TS-10242",
    customer: "David James",
    time: "09:34 AM",
    amount: "₦126,000",
    status: "Completed"
  }
];

const products = [
  {
    name: "Peak Milk 400g",
    category: "Groceries",
    stock: 4,
    level: "Low"
  },
  {
    name: "Golden Penny Pasta",
    category: "Food & Beverages",
    stock: 8,
    level: "Low"
  },
  {
    name: "Dettol Antiseptic",
    category: "Personal Care",
    stock: 26,
    level: "Good"
  },
  {
    name: "Indomie Chicken",
    category: "Groceries",
    stock: 42,
    level: "Good"
  }
];

const chartData = [
  { day: "Mon", height: 38 },
  { day: "Tue", height: 57 },
  { day: "Wed", height: 46 },
  { day: "Thu", height: 73 },
  { day: "Fri", height: 62 },
  { day: "Sat", height: 91 },
  { day: "Sun", height: 68 }
];

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Point of Sale", icon: ShoppingCart },
  { label: "Products & Inventory", icon: Package },
  { label: "Sales & Transactions", icon: Receipt },
  { label: "Customers", icon: Users },
  { label: "Suppliers", icon: Truck },
  { label: "Purchases", icon: ShoppingBag }
];

const management = [
  { label: "Expenses", icon: Wallet },
  { label: "Reports & Analytics", icon: BarChart3 },
  { label: "Staff & Permissions", icon: Users },
  { label: "Settings", icon: Settings }
];

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">T</div>
      <div>
        <div className="brand-name">TariScan</div>
        <div className="brand-subtitle">POINT OF SALE</div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <Brand />

      <div className="nav-label">WORKSPACE</div>

      {navigation.map((item) => {
        const Icon = item.icon;

        if (item.label === "Products & Inventory") {
          return <Link key={item.label} href="/products" className="nav-item"><Icon /><span>{item.label}</span></Link>;
        }

        return (
          <div
            key={item.label}
            className={`nav-item ${item.active ? "active" : "disabled"}`}
          >
            <Icon />
            <span>{item.label}</span>
            {!item.active && <span className="soon-label">Soon</span>}
          </div>
        );
      })}

      <div className="nav-label">MANAGEMENT</div>

      {management.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="nav-item disabled">
            <Icon />
            <span>{item.label}</span>
            <span className="soon-label">Soon</span>
          </div>
        );
      })}

      <div className="sidebar-bottom">
        <OfflineSyncStatus />
      </div>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <div className="brand-mark">T</div>
        <div className="brand-name">TariScan</div>
      </div>

      <div className="topbar-left">
        <div>
          <div className="page-heading">Dashboard</div>
          <div className="page-subheading">
            Your business at a glance
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <button
          className="icon-button"
          type="button"
          aria-label="Notifications"
        >
          <Bell size={17} />
        </button>

        <div className="profile">
          <div className="avatar">AD</div>
          <div className="profile-details">
            <div className="profile-name">Admin User</div>
            <div className="profile-role">Business Owner</div>
          </div>
          <ChevronDown size={14} color="#8992a5" />
        </div>
      </div>
    </header>
  );
}

function StatCard({
  title,
  value,
  note,
  icon: Icon,
  color,
  positive
}: {
  title: string;
  value: string;
  note: string;
  icon: React.ElementType;
  color: string;
  positive?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{title}</span>
        <div className={`stat-icon ${color}`}>
          <Icon />
        </div>
      </div>

      <div className="stat-value">{value}</div>

      <div className="stat-footer">
        {positive && (
          <span className="positive">
            <ArrowUpRight size={11} style={{ display: "inline" }} />
            {" "}12.8%
          </span>
        )}
        {" "}{note}
      </div>
    </div>
  );
}

function SalesChart() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="panel-title">Sales Performance</div>
          <div className="panel-description">
            Weekly sales overview
          </div>
        </div>

        <button type="button" className="date-button">
          This week <ChevronDown size={13} />
        </button>
      </div>

      <div className="chart-summary">
        ₦1,284,500
        <span>
          <ArrowUpRight size={12} style={{ display: "inline" }} />
          12.8%
        </span>
      </div>

      <div className="chart">
        {chartData.map((item) => (
          <div className="chart-column" key={item.day}>
            <div
              className={`chart-bar ${
                item.day === "Sat" ? "highlight" : ""
              }`}
              style={{ height: `${item.height}%` }}
              title={`${item.day} sales`}
            />
          </div>
        ))}
      </div>

      <div className="chart-labels">
        {chartData.map((item) => (
          <span key={item.day}>{item.day}</span>
        ))}
      </div>
    </section>
  );
}

function RecentActivity() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="panel-title">Recent Activity</div>
          <div className="panel-description">
            Latest business transactions
          </div>
        </div>
        <span className="panel-action">View all</span>
      </div>

      <div className="activity-list">
        {transactions.slice(0, 4).map((transaction) => (
          <div className="activity-item" key={transaction.id}>
            <div className="activity-icon">
              <Receipt />
            </div>

            <div className="activity-text">
              <div className="activity-name">
                {transaction.customer}
              </div>
              <div className="activity-time">
                {transaction.id} · {transaction.time}
              </div>
            </div>

            <div className="activity-amount">
              {transaction.amount}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecentSales() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="panel-title">Recent Transactions</div>
          <div className="panel-description">
            Your latest recorded sales
          </div>
        </div>
        <span className="panel-action">View transactions</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>REFERENCE</th>
              <th>CUSTOMER</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.id}</td>
                <td>{transaction.customer}</td>
                <td>
                  <strong>{transaction.amount}</strong>
                </td>
                <td>
                  <span className="stock-badge stock-good">
                    {transaction.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StockAlerts() {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="panel-title">Inventory Overview</div>
          <div className="panel-description">
            Products requiring attention
          </div>
        </div>
        <span className="panel-action">View inventory</span>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>CATEGORY</th>
              <th>STOCK</th>
              <th>STATUS</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr key={product.name}>
                <td className="product-name">{product.name}</td>
                <td>{product.category}</td>
                <td>{product.stock}</td>
                <td>
                  <span
                    className={`stock-badge ${
                      product.level === "Low"
                        ? "stock-low"
                        : "stock-good"
                    }`}
                  >
                    {product.level}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QuickActions() {
  const actions = [
    {
      title: "New Sale",
      note: "Start a transaction",
      icon: ShoppingCart
    },
    {
      title: "Add Product",
      note: "Register an item",
      icon: Plus
    },
    {
      title: "Scan Barcode",
      note: "Identify a product",
      icon: ScanBarcode
    },
    {
      title: "View Reports",
      note: "Analyse performance",
      icon: ClipboardList
    }
  ];

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="panel-title">Quick Actions</div>
          <div className="panel-description">
            Common business operations
          </div>
        </div>
      </div>

      <div className="quick-actions">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <div className="quick-action" key={action.title}>
              <div className="quick-action-icon">
                <Icon />
              </div>
              <div>
                <div className="quick-action-title">
                  {action.title}
                </div>
                <div className="quick-action-note">
                  {action.note}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MobileNavigation() {
  const items = [
    { label: "Home", icon: LayoutDashboard, active: true },
    { label: "Products", icon: Package },
    { label: "Sell", icon: ShoppingCart },
    { label: "Sales", icon: Receipt },
    { label: "More", icon: Boxes }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {items.map((item) => {
        const Icon = item.icon;

        if (item.label === "Products") {
          return <Link key={item.label} href="/products" className="mobile-nav-item"><Icon /><span>{item.label}</span></Link>;
        }

        return (
          <div
            key={item.label}
            className={`mobile-nav-item ${
              item.active ? "active" : ""
            }`}
          >
            <Icon />
            <span>{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
}

export default function DashboardPage() {
  return (
    <main className="app-shell">
      <Sidebar />

      <div className="main-area">
        <Topbar />

        <div className="dashboard-content">
          <div className="welcome-row">
            <div>
              <div className="welcome-title">
                Good day, Admin 👋
              </div>
              <div className="welcome-description">
                Here is what is happening with your business today.
              </div>
            </div>

            <button type="button" className="date-button">
              <CalendarDays size={14} />
              17 November 2026
              <ChevronDown size={13} />
            </button>
          </div>

          <div className="stats-grid">
            <StatCard
              title="Total Revenue"
              value="₦2,845,600"
              note="compared with last month"
              icon={CircleDollarSign}
              color="blue"
              positive
            />

            <StatCard
              title="Total Sales"
              value="1,284"
              note="transactions recorded"
              icon={Receipt}
              color="green"
              positive
            />

            <StatCard
              title="Gross Profit"
              value="₦684,250"
              note="estimated gross profit"
              icon={Wallet}
              color="purple"
            />

            <StatCard
              title="Total Products"
              value="1,562"
              note="registered inventory items"
              icon={Boxes}
              color="orange"
            />
          </div>

          <div className="content-grid">
            <SalesChart />
            <RecentActivity />
          </div>

          <div className="lower-grid">
            <RecentSales />
            <StockAlerts />
          </div>

          <div className="lower-grid" style={{ marginTop: 19 }}>
            <QuickActions />

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <div className="panel-title">
                    Business Health
                  </div>
                  <div className="panel-description">
                    Operational overview
                  </div>
                </div>
                <Activity size={18} color="#3157d5" />
              </div>

              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon green">
                    <CreditCard />
                  </div>
                  <div className="activity-text">
                    <div className="activity-name">
                      Sales operations
                    </div>
                    <div className="activity-time">
                      Transaction module
                    </div>
                  </div>
                  <span className="stock-badge stock-good">
                    Ready
                  </span>
                </div>

                <div className="activity-item">
                  <div className="activity-icon blue">
                    <Package />
                  </div>
                  <div className="activity-text">
                    <div className="activity-name">
                      Inventory management
                    </div>
                    <div className="activity-time">
                      Stock monitoring
                    </div>
                  </div>
                  <span className="stock-badge stock-good">
                    Ready
                  </span>
                </div>

                <div className="activity-item">
                  <div className="activity-icon">
                    <ArrowDownRight />
                  </div>
                  <div className="activity-text">
                    <div className="activity-name">
                      Cloud synchronisation
                    </div>
                    <div className="activity-time">
                      Planned integration
                    </div>
                  </div>
                  <span className="stock-badge stock-low">
                    Pending
                  </span>
                </div>

                <div className="activity-item">
                  <div className="activity-icon">
                    <AlertTriangle />
                  </div>
                  <div className="activity-text">
                    <div className="activity-name">
                      Low-stock monitoring
                    </div>
                    <div className="activity-time">
                      Inventory alerts
                    </div>
                  </div>
                  <span className="stock-badge stock-low">
                    Demo
                  </span>
                </div>
              </div>
            </section>
          </div>

          <div className="demo-notice">
            <strong>Development preview:</strong> The figures and
            transactions shown here are sample records for interface
            demonstration. Live business data, authentication,
            Supabase storage and offline synchronisation will be
            connected in subsequent development builds.
          </div>
        </div>
      </div>

      <MobileNavigation />
    </main>
  );
}
