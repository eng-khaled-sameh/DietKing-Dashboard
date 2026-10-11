"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/api";
import { useBranches } from "@/hooks/useData";

const TAB_ON  = "period-tab flex-1 sm:flex-initial text-center px-2.5 sm:px-space-md py-space-xs rounded-md font-label-md text-xs sm:text-label-md bg-primary-container text-on-primary-container font-semibold transition-colors whitespace-nowrap";
const TAB_OFF = "period-tab flex-1 sm:flex-initial text-center px-2.5 sm:px-space-md py-space-xs rounded-md font-label-md text-xs sm:text-label-md text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap";

const ROW_ON  = "bg-surface-container-high/60 hover:bg-surface-container-high transition-colors cursor-pointer";
const ROW_OFF = "hover:bg-surface-container-high/50 transition-colors cursor-pointer";
const DOT_ON  = "w-2 h-2 rounded-full bg-primary-container";
const DOT_OFF = "w-2 h-2 rounded-full bg-transparent";
const BTN_ON  = "px-space-md py-1 rounded bg-primary-container text-on-primary-container font-label-md text-label-md hover:brightness-110 transition-all shadow-sm";
const BTN_OFF = "px-space-md py-1 rounded bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container-highest transition-all";

const BAR_CLASSES = [
  "h-full bg-gradient-to-l from-primary-container to-secondary-container rounded-md transition-all duration-700",
  "h-full bg-gradient-to-l from-primary-container/90 to-secondary-container/90 rounded-md transition-all duration-700",
  "h-full bg-gradient-to-l from-primary-container/80 to-secondary-container/80 rounded-md transition-all duration-700",
  "h-full bg-gradient-to-l from-primary-container/70 to-secondary-container/70 rounded-md transition-all duration-700",
  "h-full bg-gradient-to-l from-primary-container/60 to-secondary-container/60 rounded-md transition-all duration-700",
  "h-full bg-gradient-to-l from-primary-container/50 to-secondary-container/50 rounded-md transition-all duration-700",
  "h-full bg-gradient-to-l from-primary-container/45 to-secondary-container/45 rounded-md transition-all duration-700",
  "h-full bg-gradient-to-l from-primary-container/40 to-secondary-container/40 rounded-md transition-all duration-700",
  "h-full bg-gradient-to-l from-primary-container/35 to-secondary-container/35 rounded-md transition-all duration-700",
];

const PAY = {
  card:     { box: "inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-bright text-on-surface text-label-sm font-label-sm font-semibold", icon: "credit_card",  label: "شبكة / مدى" },
  cash:     { box: "inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-tertiary-container/20 text-tertiary text-label-sm font-label-sm font-semibold", icon: "payments", label: "كاش" },
  delivery: { box: "inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-secondary-container/20 text-secondary text-label-sm font-label-sm font-semibold", icon: "moped",  label: "توصيل" },
};

function payBadge(method) {
  const m = (method || "").toLowerCase();
  let p = PAY.cash;
  if (m.includes("شبكة") || m.includes("مدى") || m.includes("فيزا") || m.includes("card") || m.includes("visa") || m.includes("pos")) {
    p = PAY.card;
  } else if (m.includes("كاش") || m.includes("cash")) {
    p = PAY.cash;
  } else if (m.includes("توصيل") || m.includes("delivery") || m.includes("جاهز") || m.includes("هنقر")) {
    p = PAY.delivery;
  }
  return (
    <span className={p.box}>
      <span className="material-symbols-outlined text-[14px]">{p.icon}</span>
      {method || p.label}
    </span>
  );
}

function fmtCurrency(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// حوّل period لتواريخ
function periodDates(period) {
  const today = new Date();
  const fmt   = (d) => d.toISOString().split("T")[0];
  if (period === "today") return { from: fmt(today), to: fmt(today) };
  if (period === "week") {
    const s = new Date(today); s.setDate(today.getDate() - 6);
    return { from: fmt(s), to: fmt(today) };
  }
  if (period === "month") {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(s), to: fmt(today) };
  }
  if (period === "all") {
    return { from: null, to: null };
  }
  return { from: null, to: null };
}

export default function SalesPage() {
  const [period, setPeriod]   = useState("month");
  const [activeId, setActiveId] = useState(null);
  const [spinning, setSpinning] = useState(false);

  const { data: rawBranches = [], isLoading: branchesLoading } = useBranches();

  const [salesData, setSalesData]     = useState(null);  // { summary, recent, by_branch }
  const [salesLoading, setSalesLoading] = useState(true);

  // تفاصيل الفاتورة المعروضة في الـ Modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails]   = useState(null);
  const [saleLoading, setSaleLoading]   = useState(false);

  const byBranch = salesData?.by_branch || [];
  const branches = rawBranches.length > 0
    ? rawBranches
    : byBranch.map(b => ({ id: b.branch_id, name: b.branch_name, city: "نشط" }));

  const isLoading = branchesLoading || salesLoading;

  useEffect(() => {
    if (branches.length > 0 && !activeId) setActiveId(branches[0].id);
  }, [branches, activeId]);

  useEffect(() => {
    fetchSales();
  }, [period]);

  async function fetchSales() {
    setSalesLoading(true);
    try {
      const { from, to } = periodDates(period);

      // 1. Try RPC get_branch_sales_summary
      let rpcSuccess = false;
      try {
        const { data, error } = await supabase.rpc("get_branch_sales_summary", {
          p_branch_id: null,
          p_from: from,
          p_to:   to,
        });
        if (!error && data && (data.summary?.count > 0 || data.recent?.length > 0)) {
          setSalesData(data);
          rpcSuccess = true;
        }
      } catch {
        // continue to direct table query
      }

      // 2. Direct table fallback if RPC didn't yield records
      if (!rpcSuccess) {
        let q = supabase
          .from("sales")
          .select("id, invoice_number, branch_id, branch_name, cashier_name, payment_method, total, sold_at, status")
          .order("sold_at", { ascending: false });

        if (from) q = q.gte("sold_at", from);
        if (to)   q = q.lte("sold_at", `${to}T23:59:59`);

        const { data: directSales, error: directErr } = await q;

        if (directSales && directSales.length > 0) {
          const completedSales = directSales.filter(s => !s.status || s.status === 'completed' || s.status === 'paid');
          const salesList = completedSales.length > 0 ? completedSales : directSales;

          const totalSales = salesList.reduce((s, r) => s + Number(r.total || 0), 0);
          const cashTotal = salesList
            .filter(r => (r.payment_method || '').toLowerCase() === 'cash')
            .reduce((s, r) => s + Number(r.total || 0), 0);
          const cardTotal = salesList
            .filter(r => ['card', 'visa', 'mada', 'pos', 'credit'].includes((r.payment_method || '').toLowerCase()))
            .reduce((s, r) => s + Number(r.total || 0), 0);
          const deliveryTotal = Math.max(0, totalSales - cashTotal - cardTotal);
          const avgBasket = salesList.length > 0 ? (totalSales / salesList.length).toFixed(2) : 0;

          // Group by branch
          const branchMap = {};
          salesList.forEach(r => {
            const bId = r.branch_id || 'unknown';
            const bName = r.branch_name || branches.find(b => b.id === bId)?.name || 'فرع';
            if (!branchMap[bId]) {
              branchMap[bId] = { branch_id: bId, branch_name: bName, total_sales: 0, count: 0 };
            }
            branchMap[bId].total_sales += Number(r.total || 0);
            branchMap[bId].count += 1;
          });
          const byBranch = Object.values(branchMap).sort((a, b) => b.total_sales - a.total_sales);

          setSalesData({
            summary: {
              total_sales: totalSales,
              count: salesList.length,
              cash_total: cashTotal,
              card_total: cardTotal,
              delivery_total: deliveryTotal,
              avg_basket: avgBasket,
            },
            recent: salesList.slice(0, 20),
            by_branch: byBranch,
          });
        } else {
          setSalesData({ summary: {}, recent: [], by_branch: [] });
        }
      }
    } catch (e) {
      console.error("Sales fetch error:", e);
      setSalesData({ summary: {}, recent: [], by_branch: [] });
    } finally {
      setSalesLoading(false);
    }
  }

  async function openSaleInvoice(sale) {
    setSelectedSale(sale);
    setSaleLoading(true);
    setSaleDetails(null);

    try {
      const { data, error } = await supabase.rpc("get_sale_details", {
        p_sale_id: sale.id,
      });
      if (!error && data && !data.error) {
        setSaleDetails(data);
        setSaleLoading(false);
        return;
      }
    } catch {}

    try {
      const { data: items } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", sale.id);

      setSaleDetails({
        ...sale,
        items: (items || []).map(it => ({
          id: it.id,
          product_name: it.product_name || "منتج",
          variant_label: it.variant_label || "افتراضي",
          qty: it.qty || 1,
          unit_price: it.unit_price || 0,
          line_total: it.line_total || ((it.qty || 1) * (it.unit_price || 0)),
        })),
      });
    } catch {
      setSaleDetails({ ...sale, items: [] });
    } finally {
      setSaleLoading(false);
    }
  }

  function handleRefresh() {
    setSpinning(true);
    fetchSales().finally(() => setSpinning(false));
  }

  const summary    = salesData?.summary    || {};
  const recent     = salesData?.recent     || [];

  // أعلى فرع مبيعاً
  const topBranch = byBranch[0] || null;
  const maxSales  = topBranch ? Number(topBranch.total_sales) : 1;

  // الفاتورة للفرع المختار
  const activeBranch = branches.find(b => b.id === activeId);
  const activeRecent = activeId
    ? recent.filter(r => r.branch_id === activeId)
    : recent;

  const totalSales    = Number(summary.total_sales    || 0);
  let cashTotal       = Number(summary.cash_total     || 0);
  let cardTotal       = Number(summary.card_total     || 0);
  let deliveryTotal   = Number(summary.delivery_total || 0);
  const count         = Number(summary.count          || 0);
  const avgBasket     = Number(summary.avg_basket     || 0);

  // احتساب تلقائي لوسائل الدفع بالعربي (كاش / شبكة)
  if (cashTotal === 0 && cardTotal === 0 && recent.length > 0) {
    cashTotal = recent
      .filter(r => (r.payment_method || "").includes("كاش") || (r.payment_method || "").toLowerCase().includes("cash"))
      .reduce((s, r) => s + Number(r.total || 0), 0);
    cardTotal = recent
      .filter(r => (r.payment_method || "").includes("شبكة") || (r.payment_method || "").includes("مدى") || (r.payment_method || "").toLowerCase().includes("card"))
      .reduce((s, r) => s + Number(r.total || 0), 0);
    deliveryTotal = Math.max(0, totalSales - cashTotal - cardTotal);
  }

  const cashPct     = totalSales > 0 ? ((cashTotal     / totalSales) * 100).toFixed(1) : "0.0";
  const cardPct     = totalSales > 0 ? ((cardTotal     / totalSales) * 100).toFixed(1) : "0.0";
  const deliveryPct = totalSales > 0 ? ((deliveryTotal / totalSales) * 100).toFixed(1) : "0.0";

  const periodLabel = { today: "اليوم", week: "هذا الأسبوع", month: "هذا الشهر", all: "كل الفترات" }[period] || "هذا الشهر";

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Header */}
      <div className="flex flex-col gap-space-lg mb-space-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm">
              <span className="w-2.5 h-7 rounded-full bg-primary-container"></span>
              <h1 className="font-headline-xl text-headline-xl text-on-surface">المبيعات</h1>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant pr-space-md mt-space-xs">
              متابعة وتحليل مبيعات الفروع وطرق الدفع والعمليات المباشرة
            </p>
          </div>
          <button
            className="self-start lg:self-auto flex items-center justify-center gap-space-xs px-space-md py-space-sm rounded-lg bg-primary-container text-on-primary-container hover:bg-primary-container/90 transition-all font-label-lg text-label-lg shadow-sm"
            onClick={handleRefresh}
            type="button"
          >
            <span className={spinning ? "material-symbols-outlined text-[18px] animate-spin" : "material-symbols-outlined text-[18px]"}>sync</span>
            <span>تحديث فوري</span>
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md bg-surface-container-low p-space-md rounded-xl">
          <div className="flex items-center bg-surface-container-lowest p-space-xs rounded-lg overflow-x-auto no-scrollbar w-full sm:w-auto">
            {["month", "week", "today", "all"].map(p => (
              <button key={p} className={period === p ? TAB_ON : TAB_OFF} onClick={() => setPeriod(p)} type="button">
                {{ month: "هذا الشهر", week: "هذا الأسبوع", today: "اليوم", all: "كل الفترات" }[p]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-space-sm">
            {topBranch && (
              <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-md py-space-xs rounded-lg">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">الأعلى مبيعاً:</span>
                <span className="font-label-md text-label-md text-primary font-bold">
                  {topBranch.branch_name} ({fmtCurrency(topBranch.total_sales)} ر.س)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md mb-space-lg">
        {/* إجمالي المبيعات */}
        <div className="bg-surface-container p-space-md rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden hover:bg-surface-container-high transition-colors">
          <div className="absolute -left-6 -top-6 w-20 h-20 rounded-full bg-primary-container/10 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-body-md text-body-md text-on-surface-variant">إجمالي المبيعات</span>
            <div className="w-8 h-8 rounded-full bg-primary-container/20 text-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <span className={`font-display-lg text-display-lg text-on-surface tracking-tight font-extrabold leading-none ${isLoading ? "animate-pulse text-on-surface-variant" : ""}`}>
              {fmtCurrency(totalSales)}{" "}
              <span className="text-label-lg font-label-lg text-primary font-bold">ر.س</span>
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{periodLabel} — {count} عملية</span>
          </div>
        </div>

        {/* عدد العمليات */}
        <div className="bg-surface-container p-space-md rounded-xl flex flex-col justify-between shadow-sm hover:bg-surface-container-high transition-colors">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-body-md text-body-md text-on-surface-variant">عدد الفواتير</span>
            <div className="w-8 h-8 rounded-full bg-secondary-container/20 text-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <span className={`font-display-lg text-display-lg text-on-surface tracking-tight font-extrabold leading-none ${isLoading ? "animate-pulse text-on-surface-variant" : ""}`}>
              {count}{" "}
              <span className="text-label-lg font-label-lg text-secondary font-bold">فاتورة</span>
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">متوسط السلة: {fmtCurrency(avgBasket)} ر.س</span>
          </div>
        </div>

        {/* الكاش */}
        <div className="bg-surface-container p-space-md rounded-xl flex flex-col justify-between shadow-sm hover:bg-surface-container-high transition-colors">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-body-md text-body-md text-on-surface-variant">إجمالي الكاش</span>
            <div className="w-8 h-8 rounded-full bg-tertiary-container/20 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <span className={`font-display-lg text-display-lg text-on-surface tracking-tight font-extrabold leading-none ${isLoading ? "animate-pulse text-on-surface-variant" : ""}`}>
              {fmtCurrency(cashTotal)}{" "}
              <span className="text-label-lg font-label-lg text-on-surface-variant font-bold">ر.س</span>
            </span>
            <div className="flex items-center justify-between mt-space-xs text-body-sm font-body-sm">
              <span className="text-on-surface-variant">حصة المبيعات:</span>
              <span className="text-tertiary font-bold font-label-md text-label-md">{cashPct}%</span>
            </div>
          </div>
        </div>

        {/* الفيزا */}
        <div className="bg-surface-container p-space-md rounded-xl flex flex-col justify-between shadow-sm hover:bg-surface-container-high transition-colors">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-body-md text-body-md text-on-surface-variant">فيزا ومدى</span>
            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">credit_card</span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <span className={`font-display-lg text-display-lg text-on-surface tracking-tight font-extrabold leading-none ${isLoading ? "animate-pulse text-on-surface-variant" : ""}`}>
              {fmtCurrency(cardTotal)}{" "}
              <span className="text-label-lg font-label-lg text-on-surface-variant font-bold">ر.س</span>
            </span>
            <div className="flex items-center justify-between mt-space-xs text-body-sm font-body-sm">
              <span className="text-on-surface-variant">حصة المبيعات:</span>
              <span className="text-primary font-bold font-label-md text-label-md">{cardPct}%</span>
            </div>
          </div>
        </div>

        {/* التوصيل */}
        <div className="bg-surface-container p-space-md rounded-xl flex flex-col justify-between shadow-sm hover:bg-surface-container-high transition-colors">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-body-md text-body-md text-on-surface-variant">إجمالي التوصيل</span>
            <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <span className={`font-display-lg text-display-lg text-on-surface tracking-tight font-extrabold leading-none ${isLoading ? "animate-pulse text-on-surface-variant" : ""}`}>
              {fmtCurrency(deliveryTotal)}{" "}
              <span className="text-label-lg font-label-lg text-on-surface-variant font-bold">ر.س</span>
            </span>
            <div className="flex items-center justify-between mt-space-xs text-body-sm font-body-sm">
              <span className="text-on-surface-variant">حصة المبيعات:</span>
              <span className="text-secondary font-bold font-label-md text-label-md">{deliveryPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart by branch */}
      {byBranch.length > 0 && (
        <div className="bg-surface-container p-space-lg rounded-xl mb-space-lg shadow-sm">
          <div className="flex items-center gap-space-sm mb-space-lg">
            <span className="material-symbols-outlined text-primary-container text-[22px]">bar_chart</span>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">مقارنة مبيعات الفروع</h2>
              <span className="font-body-sm text-body-sm text-on-surface-variant">توزيع المبيعات بحسب الفروع — {periodLabel}</span>
            </div>
          </div>
          <div className="flex flex-col gap-space-sm">
            {byBranch.map((row, i) => {
              const pct = maxSales > 0 ? (Number(row.total_sales) / maxSales) * 100 : 0;
              return (
                <div key={row.branch_id} className="flex items-center gap-space-sm sm:gap-space-md group cursor-pointer" onClick={() => setActiveId(row.branch_id)}>
                  <div className="w-28 sm:w-44 text-right truncate shrink-0">
                    <span className={`font-label-md text-xs sm:text-label-md transition-colors ${activeId === row.branch_id ? "text-primary font-bold" : "text-on-surface group-hover:text-primary"}`}>
                      {i + 1}. {row.branch_name}
                    </span>
                  </div>
                  <div className="flex-1 bg-surface-container-lowest h-6 rounded-md overflow-hidden relative flex items-center min-w-[50px]">
                    <div className={BAR_CLASSES[Math.min(i, BAR_CLASSES.length - 1)]} style={{ width: `${pct}%` }}></div>
                    <span className="absolute left-space-sm text-label-sm font-label-sm text-on-surface-variant font-mono">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-20 sm:w-32 text-left shrink-0">
                    <span className="font-label-md text-xs sm:text-label-md text-on-surface font-bold">
                      {fmtCurrency(row.total_sales)} <span className="text-label-sm text-on-surface-variant">ر.س</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Branches table */}
      <div className="bg-surface-container rounded-xl shadow-sm mb-space-lg overflow-hidden">
        <div className="p-space-lg flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-secondary text-[22px]">storefront</span>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface">جدول مبيعات الفروع</h2>
              <span className="font-body-sm text-body-sm text-on-surface-variant">اضغط على فرع لعرض فواتيره</span>
            </div>
          </div>
          <span className="font-label-md text-label-md px-space-md py-space-xs rounded-full bg-surface-container-high text-on-surface-variant">
            {branches.length} فرع
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[700px]">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                <th className="py-space-md px-space-lg">اسم الفرع</th>
                <th className="py-space-md px-space-md text-left">إجمالي المبيعات</th>
                <th className="py-space-md px-space-md text-center">عدد الفواتير</th>
                <th className="py-space-md px-space-lg text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y-0 text-on-surface font-body-md text-body-md">
              {branches.map(branch => {
                const bSales = byBranch.find(b => b.branch_id === branch.id);
                return (
                  <tr key={branch.id} className={activeId === branch.id ? ROW_ON : ROW_OFF} onClick={() => setActiveId(branch.id)}>
                    <td className="py-space-md px-space-lg">
                      <div className="flex items-center gap-space-sm">
                        <span className={activeId === branch.id ? DOT_ON : DOT_OFF}></span>
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface">{branch.name}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">{branch.city || branch.code || "—"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-space-md px-space-md text-left font-bold text-primary font-mono">
                      {isLoading ? "..." : bSales ? `${fmtCurrency(bSales.total_sales)} ر.س` : "0 ر.س"}
                    </td>
                    <td className="py-space-md px-space-md text-center font-mono">
                      {isLoading ? "..." : bSales ? bSales.count : 0}
                    </td>
                    <td className="py-space-md px-space-lg text-center">
                      <button className={activeId === branch.id ? BTN_ON : BTN_OFF} type="button">
                        عرض الفواتير
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent transactions for selected branch */}
      <div className="bg-surface-container rounded-xl shadow-sm overflow-hidden">
        <div className="p-space-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-space-sm bg-surface-container-high/40">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[22px]">receipt</span>
            <div className="flex items-center gap-space-xs flex-wrap">
              <h2 className="font-headline-md text-headline-md text-on-surface">تفاصيل مبيعات الفرع:</h2>
              <span className="font-headline-md text-headline-md text-primary font-bold">
                {activeBranch?.name || "كل الفروع"}
              </span>
            </div>
          </div>
          <span className="font-label-md text-label-md px-space-md py-space-xs rounded-full bg-surface-container-lowest text-on-surface-variant">
            {activeRecent.length > 0 ? `آخر ${activeRecent.length} فاتورة` : "لا توجد فواتير"}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[32px]">progress_activity</span>
          </div>
        ) : activeRecent.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-space-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[40px]">receipt_long</span>
            <span className="font-body-md text-body-md">لا توجد مبيعات في هذه الفترة</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant/60">تأكد من تشغيل migration 023_get_sales_rpc.sql في Supabase</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[750px]">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                  <th className="py-space-md px-space-lg">التاريخ والوقت</th>
                  <th className="py-space-md px-space-md">رقم الفاتورة</th>
                  <th className="py-space-md px-space-md">الفرع</th>
                  <th className="py-space-md px-space-md text-center">طريقة الدفع</th>
                  <th className="py-space-md px-space-md text-left">الإجمالي</th>
                  <th className="py-space-md px-space-lg text-center">تفاصيل الفاتورة</th>
                </tr>
              </thead>
              <tbody className="divide-y-0 text-on-surface font-body-md text-body-md">
                {activeRecent.map(row => (
                  <tr key={row.id} className="hover:bg-surface-container-high/40 transition-colors">
                    <td className="py-space-md px-space-lg font-mono text-on-surface-variant text-body-sm">
                      {new Date(row.sold_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}
                    </td>
                    <td className="py-space-md px-space-md font-mono font-bold text-primary">{row.invoice_number}</td>
                    <td className="py-space-md px-space-md text-on-surface">{row.branch_name}</td>
                    <td className="py-space-md px-space-md text-center">
                      {payBadge(row.payment_method)}
                    </td>
                    <td className="py-space-md px-space-md text-left font-mono font-bold text-on-surface">
                      {fmtCurrency(row.total)}{" "}<span className="text-on-surface-variant text-label-sm">ر.س</span>
                    </td>
                    <td className="py-space-md px-space-lg text-center">
                      <button
                        type="button"
                        onClick={() => openSaleInvoice(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary-container/20 hover:bg-primary-container/40 text-primary font-semibold text-label-sm transition-colors cursor-pointer"
                        title="عرض تفاصيل وأصناف الفاتورة"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        <span>عرض الفاتورة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal تفاصيل الفاتورة */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface-container rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-outline-variant/30 overflow-hidden">
            {/* Modal Header */}
            <div className="p-space-lg bg-surface-container-high/60 flex items-center justify-between border-b border-surface-container-highest">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">receipt_long</span>
                </div>
                <div>
                  <div className="flex items-center gap-space-xs">
                    <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                      تفاصيل الفاتورة
                    </h3>
                    <span className="font-mono text-primary font-bold px-2 py-0.5 rounded bg-primary-container/20 text-label-md">
                      {selectedSale.invoice_number}
                    </span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    الفرع: {selectedSale.branch_name || "فرع"} | التاريخ: {new Date(selectedSale.sold_at).toLocaleString("ar-SA")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-space-lg overflow-y-auto flex-1 flex flex-col gap-space-md">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm bg-surface-container-low p-space-md rounded-xl">
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">الكاشير</span>
                  <strong className="font-body-md text-body-md text-on-surface">{saleDetails?.cashier_name || "كاشير عام"}</strong>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">طريقة الدفع</span>
                  <div className="mt-0.5">{payBadge(selectedSale.payment_method)}</div>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">حالة الفاتورة</span>
                  <span className="inline-flex items-center gap-1 text-tertiary font-semibold text-label-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                    مكتملة
                  </span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">الإجمالي الكلي</span>
                  <span className="font-mono font-bold text-primary text-headline-sm">{fmtCurrency(selectedSale.total)} ر.س</span>
                </div>
              </div>

              {saleLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-space-sm">
                  <span className="material-symbols-outlined animate-spin text-[36px] text-primary">progress_activity</span>
                  <span className="font-body-md text-body-md">جاري تحميل بنود وأصناف الفاتورة...</span>
                </div>
              ) : !saleDetails?.items || saleDetails.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant gap-space-sm bg-surface-container-low rounded-xl">
                  <span className="material-symbols-outlined text-[40px] text-outline">receipt</span>
                  <span className="font-body-md text-body-md">لا توجد تفاصيل أصناف فرعية مسجلة لهذه الفاتورة</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant/70">تم تسجيل الإجمالي المباشر بقيمة {fmtCurrency(selectedSale.total)} ر.س</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                        <th className="py-2.5 px-3 rounded-r-lg">#</th>
                        <th className="py-2.5 px-3">اسم المنتج / الوجبة</th>
                        <th className="py-2.5 px-3 text-center">النوع / الحجم</th>
                        <th className="py-2.5 px-3 text-left">الكمية</th>
                        <th className="py-2.5 px-3 text-left">سعر الوحدة</th>
                        <th className="py-2.5 px-3 rounded-l-lg text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high/40">
                      {saleDetails.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-surface-container-high/30 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-outline text-label-sm">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-body-md text-body-md text-on-surface font-semibold">{item.product_name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-label-sm text-label-sm text-on-surface-variant">
                            {item.variant_label || "افتراضي"}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono font-bold text-primary text-body-md">
                            {item.qty}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono text-label-md text-on-surface-variant">
                            {Number(item.unit_price || 0).toFixed(2)} ر.س
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono font-bold text-on-surface text-label-md">
                            {Number(item.line_total || 0).toFixed(2)} ر.س
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals Summary */}
              {saleDetails?.items && saleDetails.items.length > 0 && (
                <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-1.5 self-end w-full sm:w-72">
                  <div className="flex justify-between text-body-sm text-on-surface-variant">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono">{fmtCurrency(saleDetails.subtotal || selectedSale.total)} ر.س</span>
                  </div>
                  {saleDetails.discount_amount > 0 && (
                    <div className="flex justify-between text-body-sm text-error">
                      <span>الخصم:</span>
                      <span className="font-mono">-{fmtCurrency(saleDetails.discount_amount)} ر.س</span>
                    </div>
                  )}
                  <div className="flex justify-between text-body-sm text-on-surface-variant">
                    <span>ضريبة القيمة المضافة (15%):</span>
                    <span className="font-mono">{fmtCurrency(saleDetails.vat_amount || (Number(selectedSale.total) * 0.15).toFixed(2))} ر.س</span>
                  </div>
                  <div className="border-t border-surface-container-highest pt-2 flex justify-between font-bold text-body-lg text-primary">
                    <span>الإجمالي النهائي:</span>
                    <span className="font-mono text-headline-sm">{fmtCurrency(selectedSale.total)} ر.س</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-space-md px-space-lg bg-surface-container-low border-t border-surface-container-highest flex items-center justify-between">
              <span className="font-label-md text-label-md text-on-surface-variant">
                عدد البنود: <strong className="text-on-surface font-mono">{saleDetails?.items?.length || 0}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
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
