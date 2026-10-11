"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/api";

const BADGE = {
  tertiary: { box: "inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-tertiary-container/20 text-tertiary", dot: "w-1.5 h-1.5 rounded-full bg-tertiary" },
  secondary: { box: "inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-secondary-container/20 text-secondary", dot: "w-1.5 h-1.5 rounded-full bg-secondary" },
  primary: { box: "inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-primary/20 text-primary", dot: "w-1.5 h-1.5 rounded-full bg-primary" },
  container: { box: "inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-primary-container/20 text-primary-container", dot: "w-1.5 h-1.5 rounded-full bg-primary-container" },
  error: { box: "inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-error-container/40 text-error", dot: "w-1.5 h-1.5 rounded-full bg-error" },
  neutral: { box: "inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-high text-on-surface-variant", dot: null },
  pulse: { box: "inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-high text-on-surface-variant", dot: "w-1.5 h-1.5 rounded-full bg-primary animate-pulse" },
};

const ICON_TONES = {
  primary: "w-8 h-8 rounded bg-surface-container flex items-center justify-center text-primary",
  secondary: "w-8 h-8 rounded bg-surface-container flex items-center justify-center text-secondary",
  error: "w-8 h-8 rounded bg-surface-container flex items-center justify-center text-error",
};

const QTY_TONES = {
  normal: "py-space-sm px-space-md text-left font-body-lg text-body-lg text-on-surface font-mono font-bold",
  secondary: "py-space-sm px-space-md text-left font-body-lg text-body-lg text-secondary font-mono font-bold",
  error: "py-space-sm px-space-md text-left font-body-lg text-body-lg text-error font-mono font-bold",
};

export default function InventoryPage() {
  const [stock, setStock] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [finished, setFinished] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemsMap, setItemsMap] = useState({});

  // 1. Modal تفاصيل إذن صرف المطبخ (كميات وأصناف)
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [transferLines, setTransferLines] = useState([]);
  const [transferLoading, setTransferLoading] = useState(false);

  // 2. Modal سجل حركات الصنف
  const [selectedItem, setSelectedItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);

        // 1. Fetch catalog items (inventory_items or products)
        let itemsData = [];
        const { data: invItems, error: invErr } = await supabase
          .from('inventory_items')
          .select('id, name, sku, unit_code, min_level, is_active')
          .eq('is_active', true);

        if (invItems && invItems.length > 0) {
          itemsData = invItems;
        } else {
          // Fallback to products table if inventory_items has no active items
          const { data: prods } = await supabase
            .from('products')
            .select('id, name, sku');
          if (prods && prods.length > 0) {
            itemsData = prods.map(p => ({
              id: p.id,
              name: p.name,
              sku: p.sku || 'PRD-' + p.id.slice(0, 4),
              unit_code: 'وجبة',
              min_level: 10
            }));
          }
        }

        const itemMap = Object.fromEntries(itemsData.map(i => [i.id, i]));
        setItemsMap(itemMap);

        // 2. Fetch stock (via RPC or direct table query)
        let stockArr = [];
        try {
          const stockRpc = await supabase.rpc('inventory_get_stock');
          if (stockRpc.data?.stock && Array.isArray(stockRpc.data.stock)) {
            stockArr = stockRpc.data.stock;
          }
        } catch {
          // ignore RPC failure, use fallback
        }

        if (stockArr.length === 0) {
          const { data: directStock } = await supabase
            .from('inventory_stock')
            .select('item_id, quantity, updated_at');
          if (directStock && directStock.length > 0) {
            stockArr = directStock;
          }
        }

        const stockMap = Object.fromEntries(
          stockArr.map(s => [s.item_id, { qty: Number(s.quantity || 0), updated_at: s.updated_at }])
        );

        // Build display stock:
        // Priority 1: Show all catalog items with their stock quantities
        if (itemsData.length > 0) {
          setStock(itemsData.map(item => {
            const stockInfo = stockMap[item.id] || { qty: 0, updated_at: null };
            const qty = stockInfo.qty;
            const min = Number(item.min_level ?? 0);
            const isLow = min > 0 && qty <= min;
            return {
              id:       item.id,
              code:     item.sku || '-',
              name:     item.name,
              qty,
              unit:     item.unit_code || 'وحدة',
              icon:     'inventory_2',
              iconTone: 'primary',
              qtyTone:  isLow ? (qty <= 5 ? 'error' : 'secondary') : 'normal',
              tone:     isLow ? (qty <= 5 ? 'error' : 'secondary') : 'tertiary',
              label:    isLow ? (qty <= 5 ? 'شارف على النفاد' : 'منخفض') : 'متوفر بكفاية',
              updated:  stockInfo.updated_at ? new Date(stockInfo.updated_at).toLocaleDateString('ar-EG') : 'اليوم',
            };
          }));
        } else if (stockArr.length > 0) {
          // Priority 2: Show stock items even without catalog details
          setStock(stockArr.map(s => {
            const qty = Number(s.quantity || 0);
            return {
              id:       s.item_id,
              code:     s.item_id?.slice(0, 8) || '-',
              name:     s.item_name || `صنف #${s.item_id?.slice(0, 5)}`,
              qty,
              unit:     'وحدة',
              icon:     'inventory_2',
              iconTone: 'primary',
              qtyTone:  qty <= 50 ? (qty <= 10 ? 'error' : 'secondary') : 'normal',
              tone:     qty <= 10  ? 'error' : qty <= 50 ? 'secondary' : 'tertiary',
              label:    qty <= 10  ? 'شارف على النفاد' : qty <= 50 ? 'منخفض' : 'متوفر بكفاية',
              updated:  s.updated_at ? new Date(s.updated_at).toLocaleDateString('ar-EG') : 'اليوم',
            };
          }));
        }

        // 3. Kitchen Issues (صرف خامات للمطبخ)
        let issuesArr = [];
        try {
          const transfersRpc = await supabase.rpc('inventory_get_documents', { p_doc_type: 'kitchen_issues', p_limit: 20 });
          if (Array.isArray(transfersRpc.data)) issuesArr = transfersRpc.data;
        } catch {}
        if (issuesArr.length === 0) {
          const { data: dIssues } = await supabase.from('kitchen_issues').select('*').limit(20);
          if (dIssues) issuesArr = dIssues;
        }
        setTransfers(issuesArr.map(issue => ({
          id:       issue.id,
          no:       issue.number || issue.id?.slice(0, 8),
          material: issue.cook_plan || issue.notes || 'صرف خامات للمطبخ',
          qty:      (issue.lines || []).length > 0 ? `${issue.lines.length} أصناف` : 'دفعة تشغيل',
          lines:    issue.lines || [],
          time:     new Date(issue.created_at || Date.now()).toLocaleDateString('ar-EG'),
          tone:     'neutral',
          icon:     'output',
          label:    'تم الصرف من المخزن',
        })));

        // 4. Kitchen Batches (المنتجات التامة والوجبات)
        let batchesArr = [];
        try {
          const finishedRpc = await supabase.rpc('inventory_get_documents', { p_doc_type: 'kitchen_batches', p_limit: 20 });
          if (Array.isArray(finishedRpc.data)) batchesArr = finishedRpc.data;
        } catch {}
        if (batchesArr.length === 0) {
          const { data: dBatches } = await supabase.from('kitchen_batches').select('*').limit(20);
          if (dBatches) batchesArr = dBatches;
        }
        setFinished(batchesArr.map(batch => {
          const item = itemMap[batch.item_id] || {};
          return {
            id:       batch.id,
            name:     item.name || batch.batch_number || 'دفعة إنتاج وجبات',
            qty:      `${batch.quantity || 0} ${item.unit_code || 'وجبة'}`,
            produced: new Date(batch.produced_at || batch.created_at || Date.now()).toLocaleDateString('ar-EG'),
            shelf:    batch.quality_note || 'صالح لمدة 24 ساعة',
            tone:     batch.finished_at ? 'tertiary' : 'pulse',
            icon:     'set_meal',
            iconTone: 'secondary',
            label:    batch.finished_at ? 'جاهز للتوزيع للفروع' : 'قيد الإنتاج',
          };
        }));

        // 5. Branch Orders (طلبات الفروع للمخزن)
        let ordersArr = [];
        try {
          const ordersRpc = await supabase.rpc('inventory_get_documents', { p_doc_type: 'branch_orders', p_limit: 20 });
          if (Array.isArray(ordersRpc.data)) ordersArr = ordersRpc.data;
        } catch {}
        if (ordersArr.length === 0) {
          const { data: dOrders } = await supabase.from('branch_orders').select('*').limit(20);
          if (dOrders) ordersArr = dOrders;
        }
        const STATUS_MAP = {
          submitted: { tone: 'secondary',  label: 'قيد الانتظار' },
          approved:  { tone: 'primary',    label: 'تمت الموافقة' },
          rejected:  { tone: 'error',      label: 'مرفوض'       },
          received:  { tone: 'tertiary',   label: 'تم الاستلام' },
        };
        setOrders(ordersArr.map(order => {
          const s = STATUS_MAP[order.status] || { tone: 'neutral', label: order.status || 'مكتمل' };
          return {
            no:     order.number || order.id?.slice(0, 8),
            branch: order.branch_name || 'فرع',
            item:   (order.lines || []).length > 0
                      ? `${(order.lines || []).length} أصناف`
                      : 'طلبية وجبات ومستلزمات',
            qty:    (order.lines || []).reduce((sum, l) => sum + (l.qty_requested || 0), 0) || 'مكتمل',
            date:   new Date(order.created_at || Date.now()).toLocaleDateString('ar-EG'),
            tone:   s.tone,
            label:  s.label,
          };
        }));

      } catch (error) {
        console.error("Error fetching inventory data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // فتح تفاصيل إذن صرف المطبخ
  async function openTransferDetails(transfer) {
    setSelectedTransfer(transfer);
    setTransferLoading(true);
    setTransferLines([]);
    try {
      const { data } = await supabase.rpc('get_kitchen_issue_details', {
        p_issue_number: transfer.no,
        p_issue_id: transfer.id
      });
      if (data && data.lines && data.lines.length > 0) {
        setTransferLines(data.lines);
        setTransferLoading(false);
        return;
      }
    } catch {}

    if (transfer.lines && transfer.lines.length > 0) {
      setTransferLines(transfer.lines.map(l => ({
        id: l.id,
        item_name: itemsMap[l.item_id]?.name || 'خامة مستودع',
        sku: itemsMap[l.item_id]?.sku || '-',
        unit_code: itemsMap[l.item_id]?.unit_code || 'وحدة',
        qty: l.qty,
        unit_cost_snapshot: l.unit_cost_snapshot,
        total_cost: Number(l.qty || 0) * Number(l.unit_cost_snapshot || 0)
      })));
    } else {
      const { data: dLines } = await supabase
        .from('kitchen_issue_lines')
        .select('*')
        .eq('issue_id', transfer.id);
      if (dLines && dLines.length > 0) {
        setTransferLines(dLines.map(l => ({
          id: l.id,
          item_name: itemsMap[l.item_id]?.name || 'خامة مستودع',
          sku: itemsMap[l.item_id]?.sku || '-',
          unit_code: itemsMap[l.item_id]?.unit_code || 'وحدة',
          qty: l.qty,
          unit_cost_snapshot: l.unit_cost_snapshot,
          total_cost: Number(l.qty || 0) * Number(l.unit_cost_snapshot || 0)
        })));
      } else {
        setTransferLines([]);
      }
    }
    setTransferLoading(false);
  }

  // فتح سجل حركات الصنف
  async function openItemMovements(item) {
    setSelectedItem(item);
    setMovementsLoading(true);
    setMovements([]);
    try {
      const { data } = await supabase.rpc('get_item_movements_history', {
        p_item_id: item.id
      });
      if (data && data.movements && data.movements.length > 0) {
        setMovements(data.movements);
        setMovementsLoading(false);
        return;
      }
    } catch {}

    try {
      const { data } = await supabase.rpc('inventory_get_item_movements', {
        p_item_id: item.id
      });
      if (Array.isArray(data) && data.length > 0) {
        setMovements(data.map(m => ({
          id: m.id,
          occurred_at: m.occurred_at,
          type_label: m.movement_type === 'kitchen_issue' ? 'صرف للمطبخ' :
                      m.movement_type === 'supply_receipt' ? 'توريد مشتريات' :
                      m.movement_type === 'opening' ? 'رصيد افتتاحي' :
                      m.movement_type === 'branch_transfer_out' ? 'تحويل لفرع' :
                      m.movement_type === 'stocktake_adjust' ? 'تسوية جرد' : m.movement_type,
          qty_delta: m.qty_delta,
          balance_after: m.balance_after,
          unit_cost: m.unit_cost,
          warehouse_name: 'المستودع الرئيسي',
          note: m.note
        })));
        setMovementsLoading(false);
        return;
      }
    } catch {}

    const { data: dMov } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('item_id', item.id)
      .order('occurred_at', { ascending: false })
      .limit(50);
    if (dMov && dMov.length > 0) {
      setMovements(dMov.map(m => ({
        id: m.id,
        occurred_at: m.occurred_at,
        type_label: m.movement_type === 'kitchen_issue' ? 'صرف للمطبخ' :
                    m.movement_type === 'supply_receipt' ? 'توريد مشتريات' :
                    m.movement_type === 'opening' ? 'رصيد افتتاحي' :
                    m.movement_type === 'branch_transfer_out' ? 'تحويل لفرع' :
                    m.movement_type === 'stocktake_adjust' ? 'تسوية جرد' : m.movement_type,
        qty_delta: m.qty_delta,
        balance_after: m.balance_after,
        unit_cost: m.unit_cost,
        warehouse_name: 'المستودع الرئيسي',
        note: m.note
      })));
    } else {
      setMovements([]);
    }
    setMovementsLoading(false);
  }

  return (
    <div className="flex flex-col w-full pb-space-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md py-space-lg">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm mb-space-xs">
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold tracking-tight">المخزون</h1>
            <span className="inline-flex items-center px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-primary/10 text-primary">
              نظام المزامنة الحية
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            إدارة رصيد المستودع المركزي، تدفق التوريد للمطبخ المركزي، المنتجات التامة، وطلبات الفروع التسعة
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-space-xs bg-surface-container-low px-2 sm:px-space-md py-1.5 sm:py-space-sm rounded-xl overflow-x-auto no-scrollbar w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 sm:gap-1.5 text-primary shrink-0">
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">warehouse</span>
            <span className="font-label-md text-xs sm:text-label-md">المستودع الرئيسي</span>
          </div>
          <span className="material-symbols-outlined text-outline-variant text-[14px] sm:text-[16px] shrink-0">arrow_back</span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-secondary shrink-0">
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">skillet</span>
            <span className="font-label-md text-xs sm:text-label-md">المطبخ المركزي</span>
          </div>
          <span className="material-symbols-outlined text-outline-variant text-[14px] sm:text-[16px] shrink-0">arrow_back</span>
          <div className="flex items-center gap-1 sm:gap-1.5 text-tertiary shrink-0">
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">storefront</span>
            <span className="font-label-md text-xs sm:text-label-md">الفروع الـ 9</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-space-xl">
        <div className="bg-surface-container-low p-space-lg rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container transition-colors shadow-sm">
          <div className="absolute -left-3 -top-3 w-20 h-20 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <span className="font-body-md text-body-md text-on-surface-variant font-medium">منتجات المخزون الرئيسي</span>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-lg text-display-lg font-extrabold text-on-surface tracking-tight">{isLoading ? "..." : stock.length}</span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">صنفاً</span>
            </div>
            <div className="mt-space-sm flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant bg-surface-container-lowest/50 px-space-sm py-1 rounded">
              <span>الرصيد الكلي المقدر:</span>
              <span className="text-on-surface font-semibold">52,400 كجم / وحدة</span>
            </div>
          </div>
        </div>
        
        <div className="bg-surface-container-low p-space-lg rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container transition-colors shadow-sm">
          <div className="absolute -left-3 -top-3 w-20 h-20 bg-secondary/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <span className="font-body-md text-body-md text-on-surface-variant font-medium">المورد للمطبخ المركزي</span>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">soup_kitchen</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-lg text-display-lg font-extrabold text-on-surface tracking-tight">{isLoading ? "..." : transfers.length}</span>
              <span className="font-headline-sm text-headline-sm text-secondary font-bold">عملية توريد</span>
            </div>
            <div className="mt-space-sm flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant bg-surface-container-lowest/50 px-space-sm py-1 rounded">
              <span>المواد المحولة للمطبخ:</span>
              <span className="text-secondary font-semibold">1,850 كجم مواد خام</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low p-space-lg rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container transition-colors shadow-sm">
          <div className="absolute -left-3 -top-3 w-20 h-20 bg-tertiary/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <span className="font-body-md text-body-md text-on-surface-variant font-medium">المنتجات التامة بالمطبخ</span>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">restaurant</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-lg text-display-lg font-extrabold text-on-surface tracking-tight">{isLoading ? "..." : finished.length}</span>
              <span className="font-headline-sm text-headline-sm text-tertiary font-bold">وجبة وصنف</span>
            </div>
            <div className="mt-space-sm flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant bg-surface-container-lowest/50 px-space-sm py-1 rounded">
              <span>الجاهز للشحن والتوزيع:</span>
              <span className="text-tertiary font-semibold">3,420 عبوة ووجبة</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low p-space-lg rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container transition-colors shadow-sm">
          <div className="absolute -left-3 -top-3 w-20 h-20 bg-primary-container/20 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-md">
            <span className="font-body-md text-body-md text-on-surface-variant font-medium">طلبات الفروع المعلقة</span>
            <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display-lg text-display-lg font-extrabold text-on-surface tracking-tight">{isLoading ? "..." : orders.length}</span>
              <span className="font-headline-sm text-headline-sm text-primary-container font-bold">طلبات معلقة</span>
            </div>
            <div className="mt-space-sm flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant bg-surface-container-lowest/50 px-space-sm py-1 rounded">
              <span>حالة التشغيل:</span>
              <span className="text-primary-container font-semibold">بانتظار الموافقة والتجهيز</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-space-xl">
        <section className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-2.5 h-6 bg-primary rounded-full"></div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">1. منتجات المخزون الرئيسي</h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">رصيد المواد الأولية ومستلزمات الإنتاج بالمستودع المركزي</p>
              </div>
            </div>
            <div className="flex items-center gap-space-xs bg-surface-container-high px-space-sm py-1 rounded-lg text-label-md font-label-md text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-primary">filter_list</span>
              <span>إجمالي الأصناف: {stock.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[750px]">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant font-label-md text-label-md">
                  <th className="py-space-sm px-space-md rounded-r-lg">اسم المنتج وكود الصنف</th>
                  <th className="py-space-sm px-space-md text-left">الكمية الحالية</th>
                  <th className="py-space-sm px-space-md text-center">الوحدة</th>
                  <th className="py-space-sm px-space-md text-center">حالة المخزون</th>
                  <th className="py-space-sm px-space-md text-left">آخر تحديث</th>
                  <th className="py-space-sm px-space-md rounded-l-lg text-center">حركة الصنف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {stock.map(row => (
                  <tr key={row.code} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-space-sm px-space-md">
                      <div className="flex items-center gap-space-sm">
                        <div className={ICON_TONES[row.iconTone]}>
                          <span className="material-symbols-outlined text-[18px]">{row.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-body-md text-body-md text-on-surface font-semibold">{row.name}</span>
                          <span className="font-label-sm text-label-sm text-outline tracking-wider font-mono">{row.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className={QTY_TONES[row.qtyTone]}>{row.qty}</td>
                    <td className="py-space-sm px-space-md text-center font-body-sm text-body-sm text-on-surface-variant">{row.unit}</td>
                    <td className="py-space-sm px-space-md text-center">
                      <span className={BADGE[row.tone].box}>
                        {BADGE[row.tone].dot && <span className={BADGE[row.tone].dot}></span>}
                        {row.label}
                      </span>
                    </td>
                    <td className="py-space-sm px-space-md text-left font-label-sm text-label-sm text-on-surface-variant">{row.updated}</td>
                    <td className="py-space-sm px-space-md text-center">
                      <button
                        type="button"
                        onClick={() => openItemMovements(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high hover:bg-primary/20 text-primary text-label-sm font-semibold transition-colors cursor-pointer"
                        title="عرض سجل حركات هذا الصنف"
                      >
                        <span className="material-symbols-outlined text-[16px]">history</span>
                        <span>سجل الحركات</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-2.5 h-6 bg-secondary rounded-full"></div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">2. المنتجات الموردة للمطبخ المركزي</h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">عمليات تحويل المواد الخام من المخزن الرئيسي لخطوط الإعداد والطهي</p>
              </div>
            </div>
            <div className="flex items-center gap-space-xs text-secondary font-label-md text-label-md bg-secondary/10 px-space-sm py-1 rounded-lg">
              <span className="material-symbols-outlined text-[16px]">conveyor_belt</span>
              <span>توريد اليوم النشط</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[700px]">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant font-label-md text-label-md">
                  <th className="py-space-sm px-space-md rounded-r-lg">رقم التحويل</th>
                  <th className="py-space-sm px-space-md">المادة الخام المحولة</th>
                  <th className="py-space-sm px-space-md text-left">الكمية المحولة</th>
                  <th className="py-space-sm px-space-md text-center">وقت التحويل</th>
                  <th className="py-space-sm px-space-md text-center">حالة التوريد</th>
                  <th className="py-space-sm px-space-md rounded-l-lg text-center">تفاصيل الأصناف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {transfers.map(row => (
                  <tr key={row.no} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-space-sm px-space-md font-mono text-primary font-bold text-label-lg">{row.no}</td>
                    <td className="py-space-sm px-space-md">
                      <span className="font-body-md text-body-md text-on-surface font-medium">{row.material}</span>
                    </td>
                    <td className="py-space-sm px-space-md text-left font-body-md text-body-md text-on-surface font-mono font-semibold">{row.qty}</td>
                    <td className="py-space-sm px-space-md text-center font-label-sm text-label-sm text-on-surface-variant">{row.time}</td>
                    <td className="py-space-sm px-space-md text-center">
                      <span className={BADGE[row.tone].box}>
                        <span className="material-symbols-outlined text-[14px]">{row.icon}</span>
                        {row.label}
                      </span>
                    </td>
                    <td className="py-space-sm px-space-md text-center">
                      <button
                        type="button"
                        onClick={() => openTransferDetails(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-secondary/15 hover:bg-secondary/30 text-secondary text-label-sm font-semibold transition-colors cursor-pointer"
                        title="عرض تفاصيل وكميات الخامات المصروفة"
                      >
                        <span className="material-symbols-outlined text-[16px]">list_alt</span>
                        <span>عرض الكميات</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-2.5 h-6 bg-tertiary rounded-full"></div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">3. المنتجات التامة من المطبخ</h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">الوجبات المطهوة والمعلبات المجهزة بالمطبخ المركزي والجاهزة للتوزيع</p>
              </div>
            </div>
            <span className="text-tertiary font-label-md text-label-md bg-tertiary/10 px-space-sm py-1 rounded-lg">
              مراقبة الجودة والصلاحية النشطة
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[650px]">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant font-label-md text-label-md">
                  <th className="py-space-sm px-space-md rounded-r-lg">اسم المنتج / الوجبة التامة</th>
                  <th className="py-space-sm px-space-md text-left">الكمية الجاهزة</th>
                  <th className="py-space-sm px-space-md text-center">تاريخ وساعة الإنتاج</th>
                  <th className="py-space-sm px-space-md text-center">الصلاحية</th>
                  <th className="py-space-sm px-space-md rounded-l-lg text-center">حالة الجاهزية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {finished.map((row, index) => (
                  <tr key={row.id || `${row.name}-${row.produced}-${index}`} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-space-sm px-space-md">
                      <div className="flex items-center gap-space-sm">
                        <div className={ICON_TONES[row.iconTone]}>
                          <span className="material-symbols-outlined text-[18px]">{row.icon}</span>
                        </div>
                        <span className="font-body-md text-body-md text-on-surface font-semibold">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-space-sm px-space-md text-left font-body-lg text-body-lg text-on-surface font-mono font-bold">{row.qty}</td>
                    <td className="py-space-sm px-space-md text-center font-label-sm text-label-sm text-on-surface-variant">{row.produced}</td>
                    <td className="py-space-sm px-space-md text-center font-label-sm text-label-sm text-on-surface-variant">{row.shelf}</td>
                    <td className="py-space-sm px-space-md text-center">
                      <span className={BADGE[row.tone].box}>
                        {BADGE[row.tone].dot && <span className={BADGE[row.tone].dot}></span>}
                        {row.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-2.5 h-6 bg-primary-container rounded-full"></div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">4. طلبات الفروع للمخزن</h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">سجل احتياج وتوريد الفروع التسعة من الوجبات التامة والمواد المباشرة</p>
              </div>
            </div>
            <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant bg-surface-container px-space-sm py-1 rounded-lg">
              <span className="material-symbols-outlined text-[16px] text-primary">store</span>
              <span>شبكة الفروع الـ 9 المترابطة</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[650px]">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant font-label-md text-label-md">
                  <th className="py-space-sm px-space-md rounded-r-lg">رقم الطلب</th>
                  <th className="py-space-sm px-space-md">الفرع الطالب</th>
                  <th className="py-space-sm px-space-md">المنتج / الصنف المطلوب</th>
                  <th className="py-space-sm px-space-md text-left">الكمية المطلوبة</th>
                  <th className="py-space-sm px-space-md text-center">تاريخ الطلب</th>
                  <th className="py-space-sm px-space-md rounded-l-lg text-center">حالة الطلب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {orders.map(row => (
                  <tr key={row.no} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-space-sm px-space-md font-mono text-primary font-bold text-label-lg">{row.no}</td>
                    <td className="py-space-sm px-space-md">
                      <span className="font-body-md text-body-md text-on-surface font-semibold">{row.branch}</span>
                    </td>
                    <td className="py-space-sm px-space-md text-body-md text-body-md text-on-surface">{row.item}</td>
                    <td className="py-space-sm px-space-md text-left font-body-md text-body-md text-on-surface font-mono font-bold">{row.qty}</td>
                    <td className="py-space-sm px-space-md text-center font-label-sm text-label-sm text-on-surface-variant">{row.date}</td>
                    <td className="py-space-sm px-space-md text-center">
                      <span className={BADGE[row.tone].box}>
                        {BADGE[row.tone].dot && <span className={BADGE[row.tone].dot}></span>}
                        {row.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {/* Modal تفاصيل إذن صرف المطبخ (عرض الكميات والأصناف) */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant/30 overflow-hidden">
            {/* Modal Header */}
            <div className="p-space-lg bg-surface-container-high/60 flex items-center justify-between border-b border-surface-container-highest">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">soup_kitchen</span>
                </div>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                      تفاصيل إذن صرف خامات للمطبخ
                    </h3>
                    <span className="font-mono text-secondary font-bold px-2 py-0.5 rounded bg-secondary/10 text-label-md">
                      {selectedTransfer.no}
                    </span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    تاريخ التحويل: {selectedTransfer.time} | الغرض: {selectedTransfer.material}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-space-lg overflow-y-auto flex-1">
              {transferLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-space-sm">
                  <span className="material-symbols-outlined animate-spin text-[36px] text-secondary">progress_activity</span>
                  <span className="font-body-md text-body-md">جاري تحميل كميات وأصناف الإذن...</span>
                </div>
              ) : transferLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-space-sm">
                  <span className="material-symbols-outlined text-[40px] text-outline">inventory_2</span>
                  <span className="font-body-md text-body-md">لم يتم تسجيل أصناف تفصيلية لهذا الإذن</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant/70">تم تسجيل الإذن كدفعة تشغيل عامة</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                        <th className="py-2.5 px-3 rounded-r-lg">#</th>
                        <th className="py-2.5 px-3">اسم الخامة / الصنف</th>
                        <th className="py-2.5 px-3 text-center">كود الصنف</th>
                        <th className="py-2.5 px-3 text-left">الكمية المصروفة</th>
                        <th className="py-2.5 px-3 text-left">تكلفة الوحدة</th>
                        <th className="py-2.5 px-3 rounded-l-lg text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/40">
                      {transferLines.map((line, idx) => (
                        <tr key={line.id || idx} className="hover:bg-surface-container-high/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-outline text-label-sm">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-body-md text-body-md text-on-surface font-semibold">{line.item_name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-label-sm text-on-surface-variant">{line.sku || '-'}</td>
                          <td className="py-2.5 px-3 text-left font-mono font-bold text-secondary text-body-lg">
                            {line.qty}{" "}
                            <span className="text-label-sm font-normal text-on-surface-variant">{line.unit_code || 'وحدة'}</span>
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono text-label-md text-on-surface-variant">
                            {line.unit_cost_snapshot ? `${Number(line.unit_cost_snapshot).toFixed(2)} ر.س` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono font-bold text-on-surface text-label-md">
                            {line.total_cost ? `${Number(line.total_cost).toFixed(2)} ر.س` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-space-md px-space-lg bg-surface-container-low border-t border-surface-container-highest flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">
                إجمالي الأصناف: <strong className="text-on-surface font-mono">{transferLines.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="px-space-lg py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal سجل حركة صنف المخزون */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant/30 overflow-hidden">
            {/* Modal Header */}
            <div className="p-space-lg bg-surface-container-high/60 flex items-center justify-between border-b border-surface-container-highest">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">history</span>
                </div>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                      سجل حركات الصنف
                    </h3>
                    <span className="font-body-md text-primary font-bold px-2 py-0.5 rounded bg-primary/10">
                      {selectedItem.name}
                    </span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    كود الصنف: <span className="font-mono">{selectedItem.code}</span> | الرصيد الحالي:{" "}
                    <strong className="text-on-surface font-mono">{selectedItem.qty} {selectedItem.unit}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-space-lg overflow-y-auto flex-1">
              {movementsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-space-sm">
                  <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
                  <span className="font-body-md text-body-md">جاري استرجاع سجل الحركات...</span>
                </div>
              ) : movements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-space-sm">
                  <span className="material-symbols-outlined text-[40px] text-outline">history_toggle_off</span>
                  <span className="font-body-md text-body-md">لا توجد حركات مسجلة لهذا الصنف بعد</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant/70">تظهر الحركات عند تسجيل أذونات التوريد، الصرف، أو الجرد</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                        <th className="py-2.5 px-3 rounded-r-lg">التاريخ والوقت</th>
                        <th className="py-2.5 px-3">نوع الحركة</th>
                        <th className="py-2.5 px-3 text-left">كمية الحركة</th>
                        <th className="py-2.5 px-3 text-left">الرصيد بعد الحركة</th>
                        <th className="py-2.5 px-3 text-left">تكلفة الوحدة</th>
                        <th className="py-2.5 px-3 rounded-l-lg">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/40">
                      {movements.map((m, idx) => {
                        const isPositive = Number(m.qty_delta || 0) > 0;
                        return (
                          <tr key={m.id || idx} className="hover:bg-surface-container-high/30 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-label-sm text-on-surface-variant">
                              {m.occurred_at ? new Date(m.occurred_at).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-sm font-semibold bg-surface-container-high text-on-surface">
                                {m.type_label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-left font-mono font-bold text-body-md">
                              <span className={isPositive ? "text-tertiary" : "text-error"}>
                                {isPositive ? `+${m.qty_delta}` : m.qty_delta}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-left font-mono font-semibold text-on-surface text-body-md">
                              {m.balance_after !== null && m.balance_after !== undefined ? m.balance_after : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-left font-mono text-label-sm text-on-surface-variant">
                              {m.unit_cost ? `${Number(m.unit_cost).toFixed(2)} ر.س` : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-body-sm text-body-sm text-on-surface-variant">
                              {m.note || m.warehouse_name || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-space-md px-space-lg bg-surface-container-low border-t border-surface-container-highest flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">
                إجمالي الحركات: <strong className="text-on-surface font-mono">{movements.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-space-lg py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
