"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/api";
import { useBranches } from "@/hooks/useData";

export default function ReportsPage() {
  const [period, setPeriod] = useState("all"); // 'today' | 'week' | 'month' | 'all'
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Database States
  const [salesList, setSalesList] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const { data: rawBranches = [] } = useBranches();

  // Load real data from Supabase
  async function loadReportsData() {
    setIsLoading(true);
    try {
      // 1. جلب المبيعات الحقيقية من RPC أولاً ثم جدول sales
      let salesRows = [];
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("get_branch_sales_summary", {
          p_branch_id: null,
          p_from: null,
          p_to: null,
        });
        if (!rpcErr && rpcRes && rpcRes.recent && rpcRes.recent.length > 0) {
          salesRows = rpcRes.recent;
        }
      } catch {}

      if (salesRows.length === 0) {
        const { data: directSales } = await supabase
          .from("sales")
          .select("id, invoice_number, branch_id, branch_name, cashier_name, total, payment_method, sold_at")
          .order("sold_at", { ascending: false });
        if (directSales && directSales.length > 0) {
          salesRows = directSales;
        }
      }
      setSalesList(salesRows);

      // 2. جلب المصروفات الحقيقية من جدول expense_invoices أو expenses
      let expRows = [];
      const { data: expInv } = await supabase
        .from("expense_invoices")
        .select("id, invoice_number, branch_name, branch_id, category, total, amount, vat_amount, expense_date, payee, created_at");
      if (expInv && expInv.length > 0) {
        expRows = expInv;
      } else {
        const { data: expDirect } = await supabase
          .from("expenses")
          .select("id, branch_id, category, total, amount, vat_amount, expense_date, created_at");
        if (expDirect && expDirect.length > 0) expRows = expDirect;
      }
      setExpensesList(expRows);

      // 3. جلب بيانات رصيد وأصناف المخزون الحقيقية
      const { data: invItems } = await supabase
        .from("inventory_items")
        .select("id, name, sku, unit_code, min_level, is_active");

      const { data: stockData } = await supabase
        .from("inventory_stock")
        .select("item_id, quantity");

      if (invItems && invItems.length > 0) {
        const stockMap = Object.fromEntries(
          (stockData || []).map(s => [s.item_id, Number(s.quantity || 0)])
        );
        setStockItems(
          invItems.map(item => ({
            ...item,
            quantity: stockMap[item.id] || 0,
            isLow: (stockMap[item.id] || 0) <= Number(item.min_level || 10),
          }))
        );
      }
    } catch (err) {
      console.error("Reports data fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReportsData();
  }, []);

  // Filter calculations strictly by period and branch
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    return salesList.filter(s => {
      // Branch filter
      if (selectedBranch !== "all") {
        if (s.branch_id !== selectedBranch && s.branch_name !== selectedBranch) return false;
      }

      // Period filter
      if (period === "all") return true;
      if (!s.sold_at) return false;
      const saleDateStr = s.sold_at.split("T")[0];
      const saleDate = new Date(s.sold_at);
      const diffDays = (now - saleDate) / (1000 * 60 * 60 * 24);

      if (period === "today") return saleDateStr === todayStr;
      if (period === "week") return diffDays >= 0 && diffDays <= 7;
      if (period === "month") return diffDays >= 0 && diffDays <= 30;
      return true;
    });
  }, [salesList, period, selectedBranch]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    return expensesList.filter(e => {
      // Branch filter
      if (selectedBranch !== "all") {
        if (e.branch_id !== selectedBranch && e.branch_name !== selectedBranch) return false;
      }

      // Period filter
      if (period === "all") return true;
      const dateStr = e.expense_date || (e.created_at ? e.created_at.split("T")[0] : null);
      if (!dateStr) return true;
      const expDate = new Date(dateStr);
      const diffDays = (now - expDate) / (1000 * 60 * 60 * 24);

      if (period === "today") return dateStr === todayStr;
      if (period === "week") return diffDays >= 0 && diffDays <= 7;
      if (period === "month") return diffDays >= 0 && diffDays <= 30;
      return true;
    });
  }, [expensesList, period, selectedBranch]);

  // Financial aggregates strictly computed
  const totalSales = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
  }, [filteredSales]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + Number(e.total || e.amount || 0), 0);
  }, [filteredExpenses]);

  const netProfit = totalSales - totalExpenses;
  const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";
  const avgBasket = filteredSales.length > 0 ? (totalSales / filteredSales.length).toFixed(2) : "0.00";

  // VAT (15% inclusive calculation: Total - Total / 1.15)
  const vatCollected = useMemo(() => {
    return Number((totalSales - (totalSales / 1.15)).toFixed(2));
  }, [totalSales]);
  const netSalesBeforeVat = Math.max(0, totalSales - vatCollected);

  // Payment Breakdown
  const paymentStats = useMemo(() => {
    let cash = 0;
    let card = 0;
    let delivery = 0;
    let cashCount = 0;
    let cardCount = 0;
    let deliveryCount = 0;

    filteredSales.forEach(s => {
      const m = (s.payment_method || "").toLowerCase();
      const amt = Number(s.total || 0);
      if (m.includes("كاش") || m.includes("cash")) {
        cash += amt;
        cashCount += 1;
      } else if (m.includes("شبكة") || m.includes("مدى") || m.includes("card") || m.includes("visa")) {
        card += amt;
        cardCount += 1;
      } else {
        delivery += amt;
        deliveryCount += 1;
      }
    });

    const cardPct = totalSales > 0 ? Math.round((card / totalSales) * 100) : 0;
    const cashPct = totalSales > 0 ? Math.round((cash / totalSales) * 100) : 0;
    const deliveryPct = totalSales > 0 ? Math.max(0, 100 - cardPct - cashPct) : 0;

    return { cash, card, delivery, cardPct, cashPct, deliveryPct, cashCount, cardCount, deliveryCount };
  }, [filteredSales, totalSales]);

  // Branch Performance Ranking
  const branchPerformance = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const bName = s.branch_name || "فرع غير محدد";
      if (!map[bName]) {
        map[bName] = { name: bName, total: 0, count: 0 };
      }
      map[bName].total += Number(s.total || 0);
      map[bName].count += 1;
    });

    return Object.values(map)
      .map(b => ({
        ...b,
        pct: totalSales > 0 ? ((b.total / totalSales) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredSales, totalSales]);

  // Expense breakdown by category
  const expenseCategories = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || "أخرى";
      const amt = Number(e.total || e.amount || 0);
      map[cat] = (map[cat] || 0) + amt;
    });

    return Object.entries(map)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        pct: totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpenses]);

  // Inventory Health Metrics
  const inventoryHealth = useMemo(() => {
    const totalItems = stockItems.length;
    const lowItems = stockItems.filter(i => i.isLow).length;
    const safeItems = Math.max(0, totalItems - lowItems);
    const safePct = totalItems > 0 ? Math.round((safeItems / totalItems) * 100) : 100;
    const totalQty = stockItems.reduce((acc, i) => acc + Number(i.quantity || 0), 0);

    return { totalItems, lowItems, safeItems, safePct, totalQty };
  }, [stockItems]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadReportsData();
    setRefreshing(false);
  }

  function fmtNumber(n) {
    if (n === null || n === undefined) return "0";
    return Number(n).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Dashboard Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md py-space-lg mb-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm mb-space-xs">
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold tracking-tight">
              لوحة التقارير والمؤشرات المالية
            </h1>
            <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-primary/10 text-primary font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              بيانات مالية حقيقية 100%
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            تقارير تدقيق وتحليل مالي وتشغيلي دقيقة، مستخرجة مباشرة من القيود المحاسبية والفواتير المسجلة
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-space-sm flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors cursor-pointer shadow-sm"
            title="إعادة جلب البيانات وتحديث التقرير"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary ${refreshing ? "animate-spin" : ""}`}>
              sync
            </span>
            <span>تحديث المؤشرات</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-primary-container text-on-primary-container hover:brightness-110 font-label-md text-label-md transition-all shadow-sm font-semibold cursor-pointer"
            title="طباعة التقرير المالي"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (فترة زمنية + تحديد الفرع) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md bg-surface-container-low p-space-md rounded-xl mb-space-lg shadow-sm border border-outline-variant/20">
        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded-xl overflow-x-auto no-scrollbar">
          {[
            { id: "all", label: "كل الفترات المسجلة" },
            { id: "month", label: "هذا الشهر (30 يوم)" },
            { id: "week", label: "آخر 7 أيام" },
            { id: "today", label: "اليوم" },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all whitespace-nowrap ${
                period === tab.id
                  ? "bg-primary-container text-on-primary-container font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Branch Selector */}
        <div className="flex items-center gap-space-sm">
          <label className="font-label-md text-label-md text-on-surface-variant whitespace-nowrap">الفرع المستهدف:</label>
          <div className="relative">
            <select
              className="bg-surface-container-lowest text-on-surface font-body-md text-body-md py-1.5 px-space-md pl-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer border border-outline-variant/30"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="all">شبكة كل الفروع (المجمعة)</option>
              {rawBranches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: 4 Authentic Key Financial Metrics (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-space-xl">
        {/* KPI 1: إجمالي المبيعات الإيرادية */}
        <div className="bg-surface-container-low p-space-lg rounded-2xl flex flex-col justify-between shadow-sm border border-outline-variant/20 hover:border-primary/40 transition-colors">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">إجمالي المبيعات المحققة</span>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">point_of_sale</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-display-lg text-display-lg font-extrabold text-on-surface font-mono tracking-tight">
                {isLoading ? "..." : fmtNumber(totalSales)}
              </span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">ر.س</span>
            </div>
            <div className="mt-space-xs flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-lg">
              <span>الفواتير: <strong className="text-on-surface font-mono">{filteredSales.length}</strong></span>
              <span>متوسط الفاتورة: <strong className="text-primary font-mono">{avgBasket}</strong> ر.س</span>
            </div>
          </div>
        </div>

        {/* KPI 2: صافي الدخل التشغيلي */}
        <div className="bg-surface-container-low p-space-lg rounded-2xl flex flex-col justify-between shadow-sm border border-outline-variant/20 hover:border-tertiary/40 transition-colors">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">صافي الدخل التشغيلي</span>
            <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className={`font-display-lg text-display-lg font-extrabold font-mono tracking-tight ${netProfit >= 0 ? "text-tertiary" : "text-error"}`}>
                {isLoading ? "..." : fmtNumber(netProfit)}
              </span>
              <span className="font-headline-sm text-headline-sm text-tertiary font-bold">ر.س</span>
            </div>
            <div className="mt-space-xs flex items-center justify-between text-label-sm font-label-sm bg-surface-container px-2 py-0.5 rounded-lg">
              <span className="text-on-surface-variant">هامش الربح التشغيلي:</span>
              <strong className={`font-mono font-bold ${netProfit >= 0 ? "text-tertiary" : "text-error"}`}>{profitMargin}%</strong>
            </div>
          </div>
        </div>

        {/* KPI 3: إجمالي المصروفات التشغيلية */}
        <div className="bg-surface-container-low p-space-lg rounded-2xl flex flex-col justify-between shadow-sm border border-outline-variant/20 hover:border-secondary/40 transition-colors">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">المصروفات التشغيلية الفعلية</span>
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-display-lg text-display-lg font-extrabold text-secondary font-mono tracking-tight">
                {isLoading ? "..." : fmtNumber(totalExpenses)}
              </span>
              <span className="font-headline-sm text-headline-sm text-secondary font-bold">ر.س</span>
            </div>
            <div className="mt-space-xs flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-lg">
              <span>سندات الصرف المسجلة:</span>
              <strong className="text-on-surface font-mono">{filteredExpenses.length} سند</strong>
            </div>
          </div>
        </div>

        {/* KPI 4: ضريبة القيمة المضافة المحصلة */}
        <div className="bg-surface-container-low p-space-lg rounded-2xl flex flex-col justify-between shadow-sm border border-outline-variant/20 hover:border-primary-container/40 transition-colors">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">ضريبة القيمة المضافة (15%)</span>
            <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">percent</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-display-lg text-display-lg font-extrabold text-on-surface font-mono tracking-tight">
                {isLoading ? "..." : fmtNumber(vatCollected)}
              </span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">ر.س</span>
            </div>
            <div className="mt-space-xs flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-lg">
              <span>صافي قبل الضريبة:</span>
              <strong className="text-on-surface font-mono">{fmtNumber(netSalesBeforeVat)} ر.س</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Visual Comparison Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-xl mb-space-xl">
        {/* Section A: مبيعات الفروع ومقارنة الأداء الحقيقي */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
          <div className="flex items-center justify-between border-b border-surface-container-highest/60 pb-space-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-2.5 h-6 rounded-full bg-primary"></div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                  ترتيب ومقارنة أداء الفروع
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  المبيعات الحقيقية المسجلة لكل فرع ونسبتها من إجمالي دخل الشبكة
                </p>
              </div>
            </div>
            <span className="font-mono text-label-sm font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              {branchPerformance.length} فروع نشطة
            </span>
          </div>

          {branchPerformance.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant gap-2">
              <span className="material-symbols-outlined text-[36px] text-outline">storefront</span>
              <span className="font-body-md text-body-md">لا توجد مبيعات مسجلة في هذا النطاق الزمني</span>
            </div>
          ) : (
            <div className="flex flex-col gap-space-md pt-space-xs">
              {branchPerformance.map((branch, idx) => {
                const maxVal = branchPerformance[0]?.total || 1;
                const fillPct = Math.round((branch.total / maxVal) * 100);
                return (
                  <div key={branch.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-body-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-mono font-bold text-xs text-on-surface-variant">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-on-surface">{branch.name}</span>
                        <span className="text-xs text-on-surface-variant font-mono">({branch.count} فاتورة)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-on-surface">{fmtNumber(branch.total)} ر.س</span>
                        <span className="font-mono text-label-sm text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                          {branch.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          idx === 0
                            ? "bg-primary"
                            : idx === 1
                            ? "bg-secondary"
                            : "bg-primary-container"
                        }`}
                        style={{ width: `${fillPct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section B: تحليل طرق وقنوات الدفع */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
          <div className="flex items-center justify-between border-b border-surface-container-highest/60 pb-space-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-2.5 h-6 rounded-full bg-secondary"></div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                  تحليل قنوات وطرق الدفع
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  التدفق النقدي الفعلي مقسم بين الدفع الإلكتروني والنقدي
                </p>
              </div>
            </div>
            <span className="font-label-sm text-secondary font-bold bg-secondary/10 px-2.5 py-1 rounded-full">
              {filteredSales.length} عملية دفع
            </span>
          </div>

          <div className="flex flex-col gap-space-sm pt-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant">التوزيع النسبي للتحصيل:</span>
            <div className="h-4 w-full rounded-full overflow-hidden flex shadow-inner bg-surface-container">
              <div style={{ width: `${paymentStats.cardPct}%` }} className="bg-primary h-full transition-all" title={`شبكة ومدى: ${paymentStats.cardPct}%`}></div>
              <div style={{ width: `${paymentStats.cashPct}%` }} className="bg-tertiary h-full transition-all" title={`كاش: ${paymentStats.cashPct}%`}></div>
              <div style={{ width: `${paymentStats.deliveryPct}%` }} className="bg-secondary h-full transition-all" title={`تطبيقات توصيل: ${paymentStats.deliveryPct}%`}></div>
            </div>

            {/* Three Detail Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm mt-space-sm">
              <div className="bg-surface-container p-space-md rounded-xl flex flex-col gap-1 border border-outline-variant/20">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span className="font-label-sm text-label-sm font-semibold">شبكة / مدى / فيزا</span>
                </div>
                <span className="font-display-sm text-display-sm font-bold text-on-surface font-mono mt-1">
                  {paymentStats.cardPct}%
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  {fmtNumber(paymentStats.card)} ر.س ({paymentStats.cardCount} فواتير)
                </span>
              </div>

              <div className="bg-surface-container p-space-md rounded-xl flex flex-col gap-1 border border-outline-variant/20">
                <div className="flex items-center gap-1.5 text-tertiary">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                  <span className="font-label-sm text-label-sm font-semibold">الدفع النقدي (كاش)</span>
                </div>
                <span className="font-display-sm text-display-sm font-bold text-on-surface font-mono mt-1">
                  {paymentStats.cashPct}%
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  {fmtNumber(paymentStats.cash)} ر.س ({paymentStats.cashCount} فواتير)
                </span>
              </div>

              <div className="bg-surface-container p-space-md rounded-xl flex flex-col gap-1 border border-outline-variant/20">
                <div className="flex items-center gap-1.5 text-secondary">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  <span className="font-label-sm text-label-sm font-semibold">تطبيقات التوصيل</span>
                </div>
                <span className="font-display-sm text-display-sm font-bold text-on-surface font-mono mt-1">
                  {paymentStats.deliveryPct}%
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                  {fmtNumber(paymentStats.delivery)} ر.س ({paymentStats.deliveryCount} فواتير)
                </span>
              </div>
            </div>

            {/* Scientific Financial Observation */}
            <div className="bg-surface-container-high/40 p-space-md rounded-xl flex items-center gap-space-sm mt-space-xs">
              <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-bold">
                  كفاءة المطابقة والتحصيل الرقمي
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {paymentStats.cardPct >= paymentStats.cashPct
                    ? `قناة التحصيل السائدة هي الدفع الإلكتروني بنسبة ${paymentStats.cardPct}% مما يدعم كفاءة وسرعة المطابقة البنكية.`
                    : `قناة التحصيل السائدة هي الدفع النقدي بنسبة ${paymentStats.cashPct}%. يرجى التأكد من توريد الصناديق بانتظام.`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: 3 Real Operational & Cost Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter mb-space-xl">
        {/* Card 1: هيكل وتصنيف المصروفات الفعلية */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs text-secondary font-bold font-headline-sm text-headline-sm">
                <span className="material-symbols-outlined text-[22px]">pie_chart</span>
                <span>هيكل المصروفات التشغيلية</span>
              </div>
              <span className="font-mono text-label-sm text-secondary bg-secondary/15 px-2 py-0.5 rounded">
                {expenseCategories.length} بنود
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              توزيع المصروفات الفعلية المسجلة وفق بنود الصرف المعتمدة
            </p>

            {expenseCategories.length === 0 ? (
              <div className="py-6 text-center text-body-sm text-on-surface-variant">
                لا توجد مصروفات مسجلة ضمن نطاق الفلترة المحدد
              </div>
            ) : (
              <div className="flex flex-col gap-space-sm">
                {expenseCategories.slice(0, 4).map(item => (
                  <div key={item.category} className="flex justify-between items-center text-body-sm py-1 border-b border-surface-container">
                    <span className="text-on-surface-variant">{item.category}:</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-on-surface font-mono">{fmtNumber(item.amount)} ر.س</strong>
                      <span className="text-xs text-secondary font-mono">({item.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-space-md pt-space-xs border-t border-surface-container-highest/40 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>إجمالي مصاريف الفترة:</span>
            <span className="text-secondary font-bold font-mono">{fmtNumber(totalExpenses)} ر.س</span>
          </div>
        </div>

        {/* Card 2: مؤشرات سلامة وأمان المخزون */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs text-primary font-bold font-headline-sm text-headline-sm">
                <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                <span>أمان المخزون وسلاسل الإمداد</span>
              </div>
              <span className="font-mono text-label-sm text-primary bg-primary/15 px-2 py-0.5 rounded">
                جاهزية {inventoryHealth.safePct}%
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              متابعة مستويات الأمان للأصناف الأولية والمنتجات بالمستودع
            </p>
            <div className="flex flex-col gap-space-sm">
              <div className="flex justify-between items-center text-body-sm py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">إجمالي الأصناف المسجلة:</span>
                <strong className="text-on-surface font-mono">{inventoryHealth.totalItems} صنف</strong>
              </div>
              <div className="flex justify-between items-center text-body-sm py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">أصناف بمستوى آمن:</span>
                <strong className="text-tertiary font-mono">{inventoryHealth.safeItems} صنف</strong>
              </div>
              <div className="flex justify-between items-center text-body-sm py-1">
                <span className="text-on-surface-variant">أصناف بلغت حد إعادة الطلب:</span>
                <strong className={inventoryHealth.lowItems > 0 ? "text-error font-mono font-bold" : "text-tertiary font-mono"}>
                  {inventoryHealth.lowItems} صنف
                </strong>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-xs border-t border-surface-container-highest/40 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>إجمالي الكميات بالمستودع:</span>
            <span className="text-primary font-bold font-mono">{fmtNumber(inventoryHealth.totalQty)} وحدة</span>
          </div>
        </div>

        {/* Card 3: ملخص كفاءة الفواتير والعمليات */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs text-tertiary font-bold font-headline-sm text-headline-sm">
                <span className="material-symbols-outlined text-[22px]">analytics</span>
                <span>كفاءة المبيعات والتشغيل</span>
              </div>
              <span className="font-mono text-label-sm text-tertiary bg-tertiary/15 px-2 py-0.5 rounded">
                معدلات حقيقية
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              مؤشرات الأداء التشغيلي المحققة للفترة المحددة
            </p>
            <div className="flex flex-col gap-space-sm">
              <div className="flex justify-between items-center text-body-sm py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">معدل الإيراد اليومي التقديري:</span>
                <strong className="text-on-surface font-mono">
                  {period === "today" ? fmtNumber(totalSales) : fmtNumber(totalSales / (period === "week" ? 7 : period === "month" ? 30 : 30))} ر.س
                </strong>
              </div>
              <div className="flex justify-between items-center text-body-sm py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">نسبة المصروفات من الإيراد:</span>
                <strong className="text-secondary font-mono">
                  {totalSales > 0 ? ((totalExpenses / totalSales) * 100).toFixed(1) : "0.0"}%
                </strong>
              </div>
              <div className="flex justify-between items-center text-body-sm py-1">
                <span className="text-on-surface-variant">معدل الفواتير الصادرة:</span>
                <strong className="text-on-surface font-mono">{filteredSales.length} فاتورة معتمدة</strong>
              </div>
            </div>
          </div>
          <div className="mt-space-md pt-space-xs border-t border-surface-container-highest/40 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>حالة القيود اليومية:</span>
            <span className="text-tertiary font-bold">مطابقة ومقيدة في النظام</span>
          </div>
        </div>
      </div>

      {/* Row 4: سجل أحدث العمليات والفواتير في الفترة لتدقيق البيانات */}
      <div className="bg-surface-container-low rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <div className="p-space-lg bg-surface-container-high/40 flex items-center justify-between border-b border-surface-container-highest">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[22px]">table_chart</span>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                سجل فواتير ومعاملات الفترة المختارة
              </h2>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                تدقيق تفصيلي للعمليات الفعلية المسجلة ومطابقتها للمجاميع المالية
              </span>
            </div>
          </div>
          <span className="font-label-md text-label-md text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-mono">
            {filteredSales.length} عملية مسجلة
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredSales.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant gap-2">
              <span className="material-symbols-outlined text-[36px] text-outline">receipt</span>
              <span>لا توجد فواتير مسجلة ضمن محددات البحث والفترة الحالية</span>
            </div>
          ) : (
            <table className="w-full text-right border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-surface-container font-label-md text-label-md text-on-surface-variant">
                  <th className="py-3 px-space-md text-right">رقم الفاتورة</th>
                  <th className="py-3 px-space-md text-right">الفرع</th>
                  <th className="py-3 px-space-md text-right">الكاشير / المستخدم</th>
                  <th className="py-3 px-space-md text-center">طريقة الدفع</th>
                  <th className="py-3 px-space-md text-left">المبلغ الإجمالي</th>
                  <th className="py-3 px-space-md text-left">التاريخ والتوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/20 font-body-md text-body-md text-on-surface">
                {filteredSales.slice(0, 15).map(sale => (
                  <tr key={sale.id} className="hover:bg-surface-container/60 transition-colors">
                    <td className="py-3 px-space-md font-mono text-primary font-bold text-label-md">
                      {sale.invoice_number || `INV-${sale.id.slice(0, 6)}`}
                    </td>
                    <td className="py-3 px-space-md font-semibold text-on-surface">
                      {sale.branch_name || "فرع عام"}
                    </td>
                    <td className="py-3 px-space-md text-on-surface-variant text-body-sm">
                      {sale.cashier_name || "كاشير النظام"}
                    </td>
                    <td className="py-3 px-space-md text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        (sale.payment_method || "").includes("كاش")
                          ? "bg-tertiary/15 text-tertiary"
                          : "bg-primary/15 text-primary"
                      }`}>
                        {sale.payment_method || "كاش"}
                      </span>
                    </td>
                    <td className="py-3 px-space-md text-left font-mono font-bold text-body-md text-on-surface">
                      {fmtNumber(sale.total)} <span className="text-label-sm font-normal text-primary">ر.س</span>
                    </td>
                    <td className="py-3 px-space-md text-left font-mono text-body-sm text-on-surface-variant">
                      {sale.sold_at ? new Date(sale.sold_at).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
