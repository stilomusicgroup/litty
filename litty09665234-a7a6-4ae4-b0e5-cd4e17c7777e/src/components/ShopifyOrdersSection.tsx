import React, { useState, useEffect, useCallback } from 'react';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { RefreshCw, Package, CheckCircle, XCircle, Clock, AlertCircle, Zap, ChevronDown, ChevronUp } from 'lucide-react';

const PURPLE = '#8B5CF6';
const GREEN = '#10B981';
const RED = '#EF4444';
const AMBER = '#F59E0B';
const BLUE = '#3B82F6';

interface ShopifyLineItem {
  sku: string;
  title: string;
  quantity: number;
  price: string;
  fulfillmentStatus: string | null;
}

interface OurPurchase {
  purchaseId: string;
  status: string;
  packId: string;
  packName: string;
  artistPayoutStatus: string | null;
  buyerEmail: string;
  buyerAddress: string;
  createdAt: number;
}

interface AnnotatedOrder {
  shopifyOrderId: string;
  orderNumber: number;
  name: string;
  email: string;
  financialStatus: string;
  fulfillmentStatus: string | null;
  createdAt: string;
  totalPrice: string;
  currency: string;
  lineItems: ShopifyLineItem[];
  inOurDb: boolean;
  ourPurchases: OurPurchase[];
}

function formatDate(iso: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fulfillmentStatusLabel(status: string | null): { label: string; color: string } {
  if (!status) return { label: 'Unfulfilled', color: AMBER };
  if (status === 'fulfilled') return { label: 'Fulfilled', color: GREEN };
  if (status === 'partial') return { label: 'Partial', color: AMBER };
  return { label: status, color: AMBER };
}

function purchaseStatusLabel(status: string): { label: string; color: string } {
  if (status === 'completed') return { label: 'Completed', color: GREEN };
  if (status === 'partial') return { label: 'Partial', color: AMBER };
  if (status === 'pending_wallet') return { label: 'Pending Wallet', color: AMBER };
  if (status === 'failed') return { label: 'Failed', color: RED };
  if (status === 'pending') return { label: 'Pending', color: AMBER };
  if (status === 'pending_oversold') return { label: 'Oversold', color: RED };
  if (status === 'pending_insufficient_funds') return { label: 'Insufficient Funds', color: RED };
  return { label: status, color: AMBER };
}

function isStuck(order: AnnotatedOrder): boolean {
  if (order.financialStatus !== 'paid') return false;
  if (order.inOurDb) {
    const allCompleted = order.ourPurchases.every(p => p.status === 'completed');
    if (allCompleted) return false;
  }
  const hasPackSku = order.lineItems.some(li => li.sku && li.sku.startsWith('pack_'));
  return hasPackSku;
}

const OrderRow: React.FC<{
  order: AnnotatedOrder;
  token: string;
  walletAddress: string;
  onFulfilled: () => void;
}> = ({ order, token, walletAddress, onFulfilled }) => {
  const [expanded, setExpanded] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const stuck = isStuck(order);
  const fStatus = fulfillmentStatusLabel(order.fulfillmentStatus);

  const handleFulfill = useCallback(async () => {
    setFulfilling(true);
    try {
      const authApi = createAuthenticatedApiClient(token, walletAddress);
      const result = await authApi.post('/api/admin/purchases/auto-fulfill-by-order', {
        orderNumber: order.orderNumber,
      }) as any;
      if (result?.status === 'already_completed') {
        toast.success(`Order #${order.orderNumber} already fulfilled`);
      } else {
        toast.success(`Order #${order.orderNumber} fulfilled — status: ${result?.status ?? 'done'}`);
      }
      onFulfilled();
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      toast.error(`Fulfill failed: ${msg}`);
    } finally {
      setFulfilling(false);
    }
  }, [token, walletAddress, order.orderNumber, onFulfilled]);

  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        style={{
          borderBottom: '1px solid rgba(139,92,246,0.08)',
          cursor: 'pointer',
          background: stuck ? 'rgba(239,68,68,0.03)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        {/* Order # */}
        <td className="py-3 px-3 whitespace-nowrap">
          <span className="text-sm font-bold font-mono" style={{ color: '#e0d7ff' }}>
            {order.name}
          </span>
          {stuck && (
            <span
              className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full uppercase"
              style={{ background: 'rgba(239,68,68,0.15)', color: RED, border: `1px solid rgba(239,68,68,0.25)` }}
            >
              STUCK
            </span>
          )}
        </td>

        {/* Email */}
        <td className="py-3 px-3">
          <span className="text-xs" style={{ color: 'rgba(220,214,240,0.6)' }}>
            {order.email || '--'}
          </span>
        </td>

        {/* SKUs */}
        <td className="py-3 px-3">
          <div className="flex flex-wrap gap-1">
            {order.lineItems.filter(li => li.sku).map((li, i) => (
              <span
                key={i}
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  background: li.sku.startsWith('pack_')
                    ? 'rgba(139,92,246,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  color: li.sku.startsWith('pack_') ? '#c4b5fd' : 'rgba(220,214,240,0.5)',
                  border: `1px solid ${li.sku.startsWith('pack_') ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.07)'}`,
                }}
              >
                {li.sku}
              </span>
            ))}
          </div>
        </td>

        {/* Fulfillment status */}
        <td className="py-3 px-3 whitespace-nowrap">
          <span
            className="text-xs font-semibold px-2 py-1 rounded-md"
            style={{
              background: `${fStatus.color}18`,
              color: fStatus.color,
              border: `1px solid ${fStatus.color}33`,
            }}
          >
            {fStatus.label}
          </span>
        </td>

        {/* Our DB */}
        <td className="py-3 px-3 whitespace-nowrap">
          {order.inOurDb ? (
            <div className="flex flex-col gap-1">
              {order.ourPurchases.map((p, i) => {
                const pStatus = purchaseStatusLabel(p.status);
                return (
                  <span
                    key={i}
                    className="text-xs font-semibold px-2 py-0.5 rounded-md inline-block"
                    style={{
                      background: `${pStatus.color}18`,
                      color: pStatus.color,
                      border: `1px solid ${pStatus.color}33`,
                    }}
                  >
                    {pStatus.label}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-xs" style={{ color: 'rgba(220,214,240,0.3)' }}>Not in DB</span>
          )}
        </td>

        {/* Date */}
        <td className="py-3 px-3 whitespace-nowrap">
          <span className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>
            {formatDate(order.createdAt)}
          </span>
        </td>

        {/* Actions */}
        <td className="py-3 px-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            {stuck && (
              <button
                onClick={handleFulfill}
                disabled={fulfilling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: fulfilling
                    ? 'rgba(139,92,246,0.1)'
                    : 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))',
                  border: '1px solid rgba(139,92,246,0.4)',
                  color: fulfilling ? 'rgba(139,92,246,0.5)' : '#e0d7ff',
                  cursor: fulfilling ? 'not-allowed' : 'pointer',
                  minWidth: '80px',
                }}
              >
                {fulfilling ? (
                  <RefreshCw size={11} className="animate-spin" />
                ) : (
                  <Zap size={11} />
                )}
                {fulfilling ? 'Fulfilling…' : 'Fulfill'}
              </button>
            )}
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1 rounded"
              style={{ color: 'rgba(220,214,240,0.3)' }}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
          <td colSpan={7} className="px-4 pb-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Line items detail */}
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)' }}
              >
                <h4 className="text-xs font-bold uppercase mb-3" style={{ color: 'rgba(220,214,240,0.4)', letterSpacing: '0.1em' }}>
                  Line Items
                </h4>
                <div className="space-y-2">
                  {order.lineItems.map((li, i) => (
                    <div key={i} className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#e0d7ff' }}>{li.title}</div>
                        <div className="text-xs font-mono mt-0.5" style={{ color: 'rgba(220,214,240,0.4)' }}>
                          SKU: {li.sku || '(none)'} · Qty: {li.quantity} · ${li.price}
                        </div>
                      </div>
                      {li.fulfillmentStatus && (
                        <span className="text-xs" style={{ color: li.fulfillmentStatus === 'fulfilled' ? GREEN : AMBER }}>
                          {li.fulfillmentStatus}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Our DB records */}
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)' }}
              >
                <h4 className="text-xs font-bold uppercase mb-3" style={{ color: 'rgba(220,214,240,0.4)', letterSpacing: '0.1em' }}>
                  DB Records
                </h4>
                {order.inOurDb ? (
                  <div className="space-y-3">
                    {order.ourPurchases.map((p, i) => {
                      const pStatus = purchaseStatusLabel(p.status);
                      return (
                        <div key={i} className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono" style={{ color: 'rgba(220,214,240,0.45)' }}>
                              {p.purchaseId.slice(0, 28)}…
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span style={{ color: pStatus.color }}>Status: {pStatus.label}</span>
                            <span style={{ color: 'rgba(220,214,240,0.4)' }}>Pack: {p.packName || p.packId}</span>
                            {p.artistPayoutStatus && (
                              <span style={{ color: p.artistPayoutStatus === 'paid' ? GREEN : AMBER }}>
                                Payout: {p.artistPayoutStatus}
                              </span>
                            )}
                          </div>
                          {p.buyerAddress && (
                            <div className="font-mono" style={{ color: 'rgba(220,214,240,0.35)' }}>
                              {p.buyerAddress.slice(0, 8)}…{p.buyerAddress.slice(-6)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2" style={{ color: 'rgba(220,214,240,0.35)' }}>
                    <AlertCircle size={13} />
                    <span className="text-xs">No purchase record found in our database</span>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const ShopifyOrdersSection: React.FC<{ token: string; walletAddress: string }> = ({
  token,
  walletAddress,
}) => {
  const [orders, setOrders] = useState<AnnotatedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'all' | 'stuck'>('all');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const authApi = createAuthenticatedApiClient(token, walletAddress);
      const result = await authApi.get('/api/admin/shopify/recent-orders') as any;
      setOrders(result?.orders ?? []);
      setLastFetched(new Date());
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      toast.error(`Failed to load orders: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [token, walletAddress]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const displayed = filter === 'stuck'
    ? orders.filter(isStuck)
    : orders;

  const stuckCount = orders.filter(isStuck).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#e0d7ff' }}>Shopify Orders</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(220,214,240,0.4)' }}>
            Last 25 orders cross-referenced with our database
            {lastFetched && (
              <span> · fetched {lastFetched.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: '1px solid rgba(139,92,246,0.2)' }}
          >
            {(['all', 'stuck'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-xs font-bold transition-all"
                style={{
                  background: filter === f
                    ? 'rgba(139,92,246,0.25)'
                    : 'rgba(0,0,0,0.3)',
                  color: filter === f ? '#e0d7ff' : 'rgba(220,214,240,0.4)',
                }}
              >
                {f === 'all' ? `All (${orders.length})` : `Stuck (${stuckCount})`}
              </button>
            ))}
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: 'rgba(139,92,246,0.1)',
              border: '1px solid rgba(139,92,246,0.2)',
              color: PURPLE,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary chips */}
      {orders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Total', value: orders.length, color: PURPLE },
            { label: 'Paid', value: orders.filter(o => o.financialStatus === 'paid').length, color: GREEN },
            { label: 'In DB', value: orders.filter(o => o.inOurDb).length, color: BLUE },
            { label: 'Stuck', value: stuckCount, color: RED },
          ].map(chip => (
            <div
              key={chip.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: `${chip.color}12`,
                border: `1px solid ${chip.color}28`,
                color: chip.color,
              }}
            >
              <span className="font-black text-sm">{chip.value}</span>
              <span className="font-medium opacity-80">{chip.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(15,5,30,0.85)', border: '1px solid rgba(139,92,246,0.12)' }}
      >
        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-16" style={{ color: 'rgba(220,214,240,0.3)' }}>
            <RefreshCw size={20} className="animate-spin mr-3" />
            <span className="text-sm">Loading Shopify orders…</span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package size={32} style={{ color: 'rgba(139,92,246,0.3)' }} />
            <p className="text-sm" style={{ color: 'rgba(220,214,240,0.35)' }}>
              {filter === 'stuck' ? 'No stuck orders found' : 'No orders found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(139,92,246,0.12)' }}>
                  {['Order', 'Email', 'SKU(s)', 'Shopify Status', 'Our DB Status', 'Date', 'Action'].map(h => (
                    <th
                      key={h}
                      className="py-3 px-3 text-left text-xs font-bold uppercase"
                      style={{ color: 'rgba(220,214,240,0.3)', letterSpacing: '0.08em' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(order => (
                  <OrderRow
                    key={order.shopifyOrderId}
                    order={order}
                    token={token}
                    walletAddress={walletAddress}
                    onFulfilled={fetchOrders}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stuck orders explainer */}
      {stuckCount > 0 && (
        <div
          className="rounded-xl p-4 flex gap-3"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <AlertCircle size={16} style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: RED }}>
              {stuckCount} stuck order{stuckCount !== 1 ? 's' : ''} detected
            </p>
            <p className="text-xs" style={{ color: 'rgba(220,214,240,0.5)' }}>
              An order is "stuck" when it is paid, has a pack SKU, but is either missing from our
              database or not yet completed. Click "Fulfill" to auto-fetch the buyer email and
              pack SKU from Shopify and run the fulfillment pipeline.
              If the buyer wallet cannot be resolved automatically, pass{' '}
              <code className="font-mono" style={{ color: '#c4b5fd' }}>buyerWallet</code>{' '}
              manually via the fulfill-new or auto-fulfill-by-order endpoints.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopifyOrdersSection;
