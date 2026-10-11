"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/api";
import { useBranches } from "@/hooks/useData";

export default function DashboardPage() {
  const [period, setPeriod] = useState("all"); // 'today' | 'week' | 'month' | 'all'
  const [isLoading, setIsLoading] = useState(true);

  // Real Database Metrics
  const [salesList, setSalesList] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [branchOrders, setBranchOrders] = useState([]);

  const { data: rawBranches = [] } = useBranches();

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        // 1. جلب المبيعات الحقيقية من RPC أولاً ثم جدول sales
        let salesRows = [];
        try {
          const { data: rpcRes } = await supabase.rpc("get_branch_sales_summary", {
            p_branch_id: null,
            p_from: null,
            p_to: null,
          });
          if (rpcRes && rpcRes.recent && rpcRes.recent.length > 0) {
            salesRows = rpcRes.recent;
          }
        } catch {}

        if (salesRows.length === 0) {
          const { data: directSales } = await supabase
            .from("sales")
            .select("id, invoice_number, branch_id, branch_name, total, payment_method, sold_at")
            .order("sold_at", { ascending: false });
          if (directSales && directSales.length > 0) {
            salesRows = directSales;
          }
        }
        setSalesList(salesRows);

        // 2. جلب المصروفات الحقيقية من جدول expenses / expense_invoices
        let expRows = [];
        const { data: expInvoices } = await supabase
          .from("expense_invoices")
          .select("id, invoice_number, branch_name, category, total, amount, expense_date");
        if (expInvoices && expInvoices.length > 0) {
          expRows = expInvoices;
        } else {
          const { data: expDirect } = await supabase
            .from("expenses")
            .select("id, branch_id, category, total, amount, expense_date");
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
          setStockItems(invItems.map(item => ({
            ...item,
            quantity: stockMap[item.id] || 0,
            isLow: (stockMap[item.id] || 0) <= Number(item.min_level || 10),
          })));
        }

        // 4. جلب طلبات الفروع الحقيقية عبر RPC أو الجداول
        try {
          const { data: ordersData } = await supabase.rpc(
            "inventory_get_documents",
            { p_doc_type: "branch_orders", p_limit: 10 }
          );
          if (Array.isArray(ordersData) && ordersData.length > 0) {
            setBranchOrders(ordersData);
          } else {
            const { data: dOrders } = await supabase
              .from("branch_orders")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(10);
            if (dOrders) setBranchOrders(dOrders);
          }
        } catch {}
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // تصفية المبيعات والمصروفات وفق الفترة الزمنية المختارة بدقة علمية
  const filteredSales = useMemo(() => {
    if (period === "all") return salesList;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    return salesList.filter(s => {
      if (!s.sold_at) return false;
      const saleDateStr = s.sold_at.split("T")[0];
      const saleDate = new Date(s.sold_at);
      const diffDays = (now - saleDate) / (1000 * 60 * 60 * 24);
      if (period === "today") return saleDateStr === todayStr;
      if (period === "week") return diffDays >= 0 && diffDays <= 7;
      if (period === "month") return diffDays >= 0 && diffDays <= 30;
      return true;
    });
  }, [salesList, period]);

  const filteredExpenses = useMemo(() => {
    if (period === "all") return expensesList;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    return expensesList.filter(e => {
      const dateStr = e.expense_date || (e.created_at ? e.created_at.split("T")[0] : null);
      if (!dateStr) return true;
      const expDate = new Date(dateStr);
      const diffDays = (now - expDate) / (1000 * 60 * 60 * 24);
      if (period === "today") return dateStr === todayStr;
      if (period === "week") return diffDays >= 0 && diffDays <= 7;
      if (period === "month") return diffDays >= 0 && diffDays <= 30;
      return true;
    });
  }, [expensesList, period]);

  const totalSales = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + Number(s.total || 0), 0);
  }, [filteredSales]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + Number(e.total || e.amount || 0), 0);
  }, [filteredExpenses]);

  // Payment Breakdown
  const paymentStats = useMemo(() => {
    let cash = 0;
    let card = 0;
    filteredSales.forEach(s => {
      const m = (s.payment_method || "").toLowerCase();
      const amt = Number(s.total || 0);
      if (m.includes("كاش") || m.includes("cash")) cash += amt;
      else card += amt;
    });
    const cashPct = totalSales > 0 ? ((cash / totalSales) * 100).toFixed(0) : "0";
    const cardPct = totalSales > 0 ? ((card / totalSales) * 100).toFixed(0) : "0";
    return { cash, card, cashPct, cardPct };
  }, [filteredSales, totalSales]);

  // Branch Sales Distribution
  const branchSales = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const bName = s.branch_name || "فرع";
      map[bName] = (map[bName] || 0) + Number(s.total || 0);
    });
    return Object.entries(map).map(([name, sum]) => ({
      name,
      sum,
      pct: totalSales > 0 ? ((sum / totalSales) * 100).toFixed(1) : "0",
    })).sort((a, b) => b.sum - a.sum);
  }, [filteredSales, totalSales]);

  // Low Stock Items count
  const lowStockCount = useMemo(() => {
    return stockItems.filter(i => i.isLow).length;
  }, [stockItems]);

  const totalStockQty = useMemo(() => {
    return stockItems.reduce((acc, i) => acc + Number(i.quantity || 0), 0);
  }, [stockItems]);

  function fmtNumber(n) {
    if (n === null || n === undefined) return "0";
    return Number(n).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Top Header / Quick Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md py-space-lg mb-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm mb-space-xs">
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold tracking-tight">
              لوحة التحكم الرئيسية
            </h1>
            <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-primary/10 text-primary font-bold">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              بيانات حية مباشرة
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            نظرة عامة دقيقة ومبنية على القيود الفعلية للمبيعات، المخزون، المصروفات، وطلبات الفروع
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-surface-container-low p-1.5 rounded-xl overflow-x-auto no-scrollbar shadow-sm">
          {[
            { id: "all", label: "كل الفترات" },
            { id: "month", label: "هذا الشهر" },
            { id: "week", label: "هذا الأسبوع" },
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
      </div>

      {/* Row 1: 4 Authentic Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-space-xl">
        {/* KPI 1: إجمالي المبيعات الفعلية */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
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
              <span>عدد الفواتير المسجلة:</span>
              <strong className="text-on-surface font-mono">{filteredSales.length} فاتورة</strong>
            </div>
          </div>
        </div>

        {/* KPI 2: المصروفات المسجلة */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">إجمالي المصروفات</span>
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
              <span>عدد سندات الصرف:</span>
              <strong className="text-on-surface font-mono">{expensesList.length} سند</strong>
            </div>
          </div>
        </div>

        {/* KPI 3: رصيد ومخزون المستودع */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">أصناف المخزون المسجلة</span>
            <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-display-lg text-display-lg font-extrabold text-on-surface font-mono tracking-tight">
                {isLoading ? "..." : stockItems.length}
              </span>
              <span className="font-headline-sm text-headline-sm text-tertiary font-bold">صنفاً نشطاً</span>
            </div>
            <div className="mt-space-xs flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-lg">
              <span>أصناف دون حد الطلب:</span>
              <strong className={lowStockCount > 0 ? "text-error font-mono font-bold" : "text-tertiary font-mono"}>
                {lowStockCount} أصناف
              </strong>
            </div>
          </div>
        </div>

        {/* KPI 4: طلبات الفروع */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-medium">طلبات الفروع للمستودع</span>
            <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">store</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-display-lg text-display-lg font-extrabold text-on-surface font-mono tracking-tight">
                {isLoading ? "..." : branchOrders.length}
              </span>
              <span className="font-headline-sm text-headline-sm text-primary font-bold">طلبية</span>
            </div>
            <div className="mt-space-xs flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-lg">
              <span>إجمالي الكميات بالمخزن:</span>
              <strong className="text-on-surface font-mono">{fmtNumber(totalStockQty)} وحدة</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Scientific, Real Operational Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-xl mb-space-xl">
        {/* Branch Real Revenue Distribution */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
          <div className="flex items-center justify-between border-b border-surface-container-highest/60 pb-space-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-2.5 h-6 rounded-full bg-primary"></div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                  توزيع المبيعات حسب الفروع
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  المبيعات الحقيقية المسجلة لكل فرع من جدول الفواتير
                </p>
              </div>
            </div>
            <span className="font-mono text-label-sm font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              {branchSales.length} فروع نشطة
            </span>
          </div>

          {branchSales.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant gap-2">
              <span className="material-symbols-outlined text-[36px] text-outline">storefront</span>
              <span className="font-body-md text-body-md">لا توجد مبيعات مسجلة في هذه الفترة</span>
            </div>
          ) : (
            <div className="flex flex-col gap-space-md pt-space-xs">
              {branchSales.map((b, idx) => {
                const maxVal = branchSales[0]?.sum || 1;
                const fillPct = Math.round((b.sum / maxVal) * 100);
                return (
                  <div key={b.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-body-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center font-mono font-bold text-xs text-primary">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-on-surface">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-on-surface">{fmtNumber(b.sum)} ر.س</span>
                        <span className="font-mono text-label-sm text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">
                          {b.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-700"
                        style={{ width: `${fillPct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Real Payment Method Breakdown */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/20 flex flex-col gap-space-md">
          <div className="flex items-center justify-between border-b border-surface-container-highest/60 pb-space-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-2.5 h-6 rounded-full bg-secondary"></div>
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                  تحليل وسائل الدفع المحققة
                </h2>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  المدفوعات النقدية (كاش) مقابل المدفوعات الإلكترونية (شبكة / مدى)
                </p>
              </div>
            </div>
            <span className="font-label-sm text-secondary font-bold bg-secondary/10 px-2.5 py-1 rounded-full">
              نسب الدفع
            </span>
          </div>

          <div className="flex flex-col gap-space-md pt-space-xs">
            {/* Visual ratio bar */}
            <div className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant">التوزيع النسبي للإيرادات:</span>
              <div className="h-4 w-full rounded-full overflow-hidden flex shadow-inner bg-surface-container">
                <div style={{ width: `${paymentStats.cardPct}%` }} className="bg-primary h-full transition-all" title={`إلكتروني: ${paymentStats.cardPct}%`}></div>
                <div style={{ width: `${paymentStats.cashPct}%` }} className="bg-tertiary h-full transition-all" title={`كاش: ${paymentStats.cashPct}%`}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-space-md">
              <div className="bg-surface-container p-space-md rounded-xl flex flex-col gap-1 border border-outline-variant/20">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span className="font-label-sm text-label-sm font-semibold">الدفع الإلكتروني (شبكة / مدى)</span>
                </div>
                <span className="font-display-sm text-display-sm font-bold text-on-surface font-mono mt-1">
                  {fmtNumber(paymentStats.card)} ر.س
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  يمثل {paymentStats.cardPct}% من إجمالي التحصيل
                </span>
              </div>

              <div className="bg-surface-container p-space-md rounded-xl flex flex-col gap-1 border border-outline-variant/20">
                <div className="flex items-center gap-1.5 text-tertiary">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                  <span className="font-label-sm text-label-sm font-semibold">الدفع النقدي (كاش)</span>
                </div>
                <span className="font-display-sm text-display-sm font-bold text-on-surface font-mono mt-1">
                  {fmtNumber(paymentStats.cash)} ر.س
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  يمثل {paymentStats.cashPct}% من إجمالي التحصيل
                </span>
              </div>
            </div>

            <div className="bg-surface-container-high/40 p-space-md rounded-xl flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant font-medium">متوسط قيمة الفاتورة (Average Ticket):</span>
              <strong className="text-primary font-mono text-body-md font-bold">
                {filteredSales.length > 0 ? (totalSales / filteredSales.length).toFixed(2) : "0.00"} ر.س
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Real Inventory Status Table (Instead of fake spline graph) */}
      <div className="bg-surface-container-low rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden mb-space-xl">
        <div className="p-space-lg bg-surface-container-high/40 flex items-center justify-between border-b border-surface-container-highest">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[22px]">inventory</span>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                موقف أرصدة المخزون الرئيسي
              </h2>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                حالة المواد الأولية والسلع وفق مستويات الأمان المعتمدة في النظام
              </span>
            </div>
          </div>
          <span className="font-label-md text-label-md text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-mono">
            {stockItems.length} صنف مسجل
          </span>
        </div>

        <div className="overflow-x-auto">
          {stockItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant gap-2">
              <span className="material-symbols-outlined text-[36px] text-outline">inventory_2</span>
              <span>لا توجد بيانات مسجلة في جدول الأصناف</span>
            </div>
          ) : (
            <table className="w-full text-right border-collapse min-w-[650px]">
              <thead>
                <tr className="bg-surface-container font-label-md text-label-md text-on-surface-variant">
                  <th className="py-3 px-space-md text-right">كود الصنف (SKU)</th>
                  <th className="py-3 px-space-md text-right">اسم الصنف</th>
                  <th className="py-3 px-space-md text-left">الرصيد الفعلي</th>
                  <th className="py-3 px-space-md text-left">الحد الأدنى للأمان</th>
                  <th className="py-3 px-space-md text-center">حالة المخزون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/20 font-body-md text-body-md text-on-surface">
                {stockItems.slice(0, 8).map(item => (
                  <tr key={item.id} className="hover:bg-surface-container/60 transition-colors">
                    <td className="py-3 px-space-md font-mono text-primary font-bold text-label-md">
                      {item.sku || `ITEM-${item.id.slice(0, 5)}`}
                    </td>
                    <td className="py-3 px-space-md font-semibold text-on-surface">
                      {item.name}
                    </td>
                    <td className="py-3 px-space-md text-left font-mono font-bold text-body-md">
                      {item.quantity}{" "}
                      <span className="text-label-sm font-normal text-on-surface-variant">{item.unit_code || "وحدة"}</span>
                    </td>
                    <td className="py-3 px-space-md text-left font-mono text-on-surface-variant">
                      {item.min_level || 10}{" "}
                      <span className="text-label-sm font-normal">{item.unit_code || "وحدة"}</span>
                    </td>
                    <td className="py-3 px-space-md text-center">
                      {item.isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-error-container/30 text-error">
                          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                          بحاجة لتوريد
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tertiary-container/30 text-tertiary">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                          متوفر بكفاية
                        </span>
                      )}
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
