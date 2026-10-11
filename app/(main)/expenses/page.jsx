"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/api";
import { useBranches } from "@/hooks/useData";

const TYPE_BADGES = {
  "إيجار": { box: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300", dot: "w-1.5 h-1.5 rounded-full bg-indigo-400" },
  "رواتب": { box: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300", dot: "w-1.5 h-1.5 rounded-full bg-emerald-400" },
  "كهرباء ومياه": { box: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300", dot: "w-1.5 h-1.5 rounded-full bg-cyan-400" },
  "صيانة": { box: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-950/80 text-orange-300", dot: "w-1.5 h-1.5 rounded-full bg-orange-400" },
  "نقل": { box: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300", dot: "w-1.5 h-1.5 rounded-full bg-amber-400" },
  "مشتريات أخرى": { box: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300", dot: "w-1.5 h-1.5 rounded-full bg-purple-400" },
  "أخرى": { box: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300", dot: "w-1.5 h-1.5 rounded-full bg-rose-400" },
};

const TYPES = ["إيجار", "كهرباء ومياه", "رواتب", "صيانة", "نقل", "مشتريات أخرى", "أخرى"];

const INITIAL_EXPENSES = [
  {
    id: "exp-1",
    invoice_number: "EXP-001-000001",
    date: "2026-10-08",
    branch: "غرناطة",
    type: "صيانة",
    payee: "مؤسسة التبريد الفني المتقدم",
    desc: "صيانة دورية لثلاجات التبريد المركزية ومعدات الطهي الكهربائية",
    amount: 1173.91,
    vat_amount: 176.09,
    total: 1350,
    payment_method: "كاش",
    cashier_name: "سامر عاشور",
    notes: "فاتورة ضريبية رقم INV-9921 معتمدة ومسددة بالكامل",
  },
  {
    id: "exp-2",
    invoice_number: "EXP-001-000002",
    date: "2026-10-07",
    branch: "غرناطة",
    type: "مشتريات أخرى",
    payee: "شركة حلول التغليف الحديثة",
    desc: "أدوات تغليف ورقية صديقة للبيئة وعلب وجبات صحية مطبوعة",
    amount: 2713.04,
    vat_amount: 406.96,
    total: 3120,
    payment_method: "تحويل بنكي",
    cashier_name: "سامر عاشور",
    notes: "سند استلام مستودع فرعي رقم 4401",
  },
  {
    id: "exp-3",
    invoice_number: "EXP-002-000001",
    date: "2026-10-06",
    branch: "حي ابحر الشمالية",
    type: "نقل",
    payee: "محطة وقود الأمانة",
    desc: "وقود دوري لمركبات النقل المبردة وتوصيل الطلبات للعملاء",
    amount: 739.13,
    vat_amount: 110.87,
    total: 850,
    payment_method: "كاش",
    cashier_name: "كاشير ابحر",
    notes: "إيصال وقود دورة التوصيل المسائية",
  },
  {
    id: "exp-4",
    invoice_number: "EXP-001-000003",
    date: "2026-10-05",
    branch: "غرناطة",
    type: "كهرباء ومياه",
    payee: "الشركة السعودية للكهرباء",
    desc: "سداد فاتورة استهلاك الكهرباء الشهرية للمطبخ والفرع",
    amount: 4200.00,
    vat_amount: 0,
    total: 4200,
    payment_method: "سداد إلكتروني",
    cashier_name: "سامر عاشور",
    notes: "رقم الحساب 30018892110 - دورة أكتوبر 2026",
  },
  {
    id: "exp-5",
    invoice_number: "EXP-001-000004",
    date: "2026-10-04",
    branch: "غرناطة",
    type: "رواتب",
    payee: "طهاة ومساعدي خطوط الإنتاج",
    desc: "سلفة ومكافآت تشغيلية إضافية لطاقم المطبخ والإعداد",
    amount: 4500.00,
    vat_amount: 0,
    total: 4500,
    payment_method: "تحويل بنكي",
    cashier_name: "سامر عاشور",
    notes: "مسير صرف ومكافآت معتمد من الإدارة",
  },
  {
    id: "exp-6",
    invoice_number: "EXP-002-000002",
    date: "2026-10-02",
    branch: "حي ابحر الشمالية",
    type: "أخرى",
    payee: "أمانة محافظة جدة",
    desc: "رسوم تجديد الشهادات الصحية للعاملين والتراخيص البلدية",
    amount: 1830.00,
    vat_amount: 0,
    total: 1830,
    payment_method: "سداد إلكتروني",
    cashier_name: "كاشير ابحر",
    notes: "سداد عبر منصة بلدي الحكومية",
  },
];

function fmtCurrency(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState(INITIAL_EXPENSES);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("all"); // 'today' | 'week' | 'month' | 'all'
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal تفاصيل المصروف
  const [selectedExpense, setSelectedExpense] = useState(null);

  // Modal إضافة مصروف جديد
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBranch, setModalBranch] = useState("");
  const [modalType, setModalType] = useState("");
  const [modalPayee, setModalPayee] = useState("");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDate, setModalDate] = useState("2026-10-10");
  const [modalDescription, setModalDescription] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalPaymentMethod, setModalPaymentMethod] = useState("كاش");
  const [nextId, setNextId] = useState(7);

  const { data: rawBranches = [] } = useBranches();
  const branchesList = rawBranches.length > 0
    ? rawBranches.map(b => b.name)
    : ["غرناطة", "حي ابحر الشمالية", "التحلية", "العليا", "الياسمين"];

  // جلب المصروفات الحية من Supabase
  useEffect(() => {
    async function fetchExpenses() {
      try {
        setLoading(true);
        // 1. فحص جدول expense_invoices
        const { data: expInv, error: errInv } = await supabase
          .from("expense_invoices")
          .select("*")
          .order("expense_date", { ascending: false });

        if (!errInv && expInv && expInv.length > 0) {
          setExpenses(expInv.map(r => ({
            id: r.id,
            invoice_number: r.invoice_number || `EXP-${r.id.slice(0, 6)}`,
            date: r.expense_date || (r.created_at ? r.created_at.split("T")[0] : "2026-10-10"),
            branch: r.branch_name || "فرع",
            type: r.category || "أخرى",
            payee: r.payee || "—",
            desc: r.description || "مصروف تشغيلي",
            amount: Number(r.amount || 0),
            vat_amount: Number(r.vat_amount || 0),
            total: Number(r.total || (Number(r.amount || 0) + Number(r.vat_amount || 0))),
            payment_method: r.payment_method === "cash" ? "كاش" : (r.payment_method || "أخرى"),
            cashier_name: r.cashier_name || "كاشير عام",
            notes: r.notes || "",
          })));
          return;
        }

        // 2. فحص جدول expenses كبديل
        const { data: expDirect, error: errDirect } = await supabase
          .from("expenses")
          .select("*")
          .order("created_at", { ascending: false });

        if (!errDirect && expDirect && expDirect.length > 0) {
          setExpenses(expDirect.map(r => ({
            id: r.id,
            invoice_number: r.number || `EXP-${r.id.slice(0, 6)}`,
            date: r.expense_date || (r.created_at ? r.created_at.split("T")[0] : "2026-10-10"),
            branch: "غرناطة",
            type: r.category || "أخرى",
            payee: r.payee || "—",
            desc: r.description || "مصروف تشغيلي",
            amount: Number(r.amount || 0),
            vat_amount: Number(r.vat_amount || 0),
            total: Number(r.total || (Number(r.amount || 0) + Number(r.vat_amount || 0))),
            payment_method: r.payment_method === "cash" ? "كاش" : "تحويل / شبكة",
            cashier_name: "كاشير",
            notes: r.notes || "",
          })));
        }
      } catch (err) {
        console.error("Error loading expenses:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchExpenses();
  }, []);

  // تصفية السجلات حسب الفترة والفرع والنوع والبحث
  const query = search.toLowerCase().trim();
  const visible = useMemo(() => {
    return expenses.filter((r) => {
      // 1. تصفية الفترة الزمنية
      if (period !== "all") {
        const rowDate = new Date(r.date);
        const today = new Date("2026-10-10");
        if (period === "today") {
          const isToday = r.date === "2026-10-10";
          if (!isToday) return false;
        } else if (period === "week") {
          const diffDays = (today - rowDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        } else if (period === "month") {
          const diffDays = (today - rowDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        }
      }

      // 2. تصفية الفرع
      const matchesBranch = !branchFilter || r.branch === branchFilter;

      // 3. تصفية النوع
      const matchesType = !typeFilter || r.type === typeFilter;

      // 4. تصفية البحث
      const matchesSearch =
        !query ||
        (r.desc && r.desc.toLowerCase().includes(query)) ||
        (r.branch && r.branch.toLowerCase().includes(query)) ||
        (r.invoice_number && r.invoice_number.toLowerCase().includes(query)) ||
        (r.payee && r.payee.toLowerCase().includes(query));

      return matchesBranch && matchesType && matchesSearch;
    });
  }, [expenses, period, branchFilter, typeFilter, query]);

  // إحصائيات سريعة ديناميكية
  const totalAmount = useMemo(() => {
    return visible.reduce((sum, r) => sum + Number(r.total || r.amount || 0), 0);
  }, [visible]);

  const avgExpense = visible.length > 0 ? (totalAmount / visible.length).toFixed(0) : 0;

  // أعلى نوع مصروف
  const topCategory = useMemo(() => {
    if (visible.length === 0) return "—";
    const counts = {};
    visible.forEach(r => { counts[r.type] = (counts[r.type] || 0) + Number(r.total || 0); });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : "—";
  }, [visible]);

  function openAddModal() {
    setModalBranch(branchesList[0] || "غرناطة");
    setModalType(TYPES[0]);
    setModalOpen(true);
  }

  function closeAddModal() {
    setModalOpen(false);
    setModalBranch("");
    setModalType("");
    setModalPayee("");
    setModalAmount("");
    setModalDate("2026-10-10");
    setModalDescription("");
    setModalNotes("");
  }

  function handleDelete(id) {
    if (window.confirm("هل أنت متأكد من حذف هذا المصروف؟")) {
      setExpenses(expenses.filter((r) => r.id !== id));
      if (selectedExpense?.id === id) setSelectedExpense(null);
    }
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    const amountVal = Number(modalAmount || 0);
    const vatVal = Number((amountVal * 0.15).toFixed(2));
    const totalVal = Number((amountVal + vatVal).toFixed(2));

    const newExpense = {
      id: `exp-${nextId}`,
      invoice_number: `EXP-001-${String(nextId).padStart(6, "0")}`,
      date: modalDate,
      branch: modalBranch,
      type: modalType,
      payee: modalPayee || "جهة خارجية",
      desc: modalDescription,
      amount: amountVal,
      vat_amount: vatVal,
      total: totalVal,
      payment_method: modalPaymentMethod,
      cashier_name: "سامر عاشور",
      notes: modalNotes,
    };

    // إضافة في الحالة المحلية
    setExpenses([newExpense, ...expenses]);
    setNextId(nextId + 1);
    closeAddModal();

    // محاولة الحفظ في Supabase
    try {
      await supabase.from("expense_invoices").insert([{
        invoice_number: newExpense.invoice_number,
        branch_name: newExpense.branch,
        category: newExpense.type,
        payee: newExpense.payee,
        description: newExpense.desc,
        amount: newExpense.amount,
        vat_amount: newExpense.vat_amount,
        total: newExpense.total,
        payment_method: modalPaymentMethod === "كاش" ? "cash" : "other",
        expense_date: newExpense.date,
        notes: newExpense.notes,
        cashier_name: "سامر عاشور",
      }]);
    } catch {}
  }

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary-container shadow-sm">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold">المصروفات</h1>
              <span className="inline-flex items-center px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-primary/10 text-primary">
                سندات الصرف
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              إدارة وتسجيل وتتبع مصروفات فروع دايت كينج التشغيلية والرأسمالية مع تفاصيل السندات
            </p>
          </div>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-space-sm">
          <button
            className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-md py-2.5 rounded-lg bg-primary-container hover:brightness-110 text-on-primary font-label-lg text-label-lg transition-all shadow-sm active:scale-95 cursor-pointer font-semibold"
            id="openAddModalBtn"
            onClick={openAddModal}
            type="button"
          >
            <span className="material-symbols-outlined text-lg leading-none">add</span>
            <span>إضافة مصروف جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">إجمالي المصروفات</span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-display-lg text-display-lg text-on-surface tracking-tight font-mono font-bold">
                  {fmtCurrency(totalAmount)}
                </span>
                <span className="font-label-md text-label-md text-primary font-bold">ر.س</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                للفترة والفروع المحددة
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-2xl">payments</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">عدد سندات الصرف</span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-display-lg text-display-lg text-secondary tracking-tight font-mono font-bold">
                  {visible.length}
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant">سند مصروف</span>
              </div>
              <span className="font-body-sm text-body-sm text-tertiary mt-space-xs flex items-center gap-0.5">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>جميع السندات مكتملة</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-2xl">receipt</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">متوسط قيمة السند</span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-display-lg text-display-lg text-tertiary tracking-tight font-mono font-bold">
                  {fmtCurrency(avgExpense)}
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant">ر.س</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                معدل إنفاق متزن
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-2xl">analytics</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface-variant">أعلى تصنيف إنفاقاً</span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
                  {topCategory}
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                يمثل الحصة الأكبر من الميزانية
              </span>
            </div>
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">pie_chart</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-xl bg-surface-container-low p-space-md mb-space-md shadow-sm flex flex-col gap-space-sm">
        {/* Period Selector Tabs (اليوم / الأسبوع / الشهر / الكل) */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-space-xs border-b border-surface-container-highest/50">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                className={`px-3 py-1 rounded-lg font-label-md text-label-md transition-colors ${
                  period === tab.id
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "bg-surface text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="font-label-sm text-label-sm text-on-surface-variant">
            سجلات المصروفات المعروضة: <strong className="text-on-surface font-mono">{visible.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center">
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input
              className="w-full bg-surface text-on-surface font-body-md text-body-md pl-space-md pr-10 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container transition-all placeholder:text-on-surface-variant/60"
              id="searchInput"
              placeholder="بحث في الوصف، رقم السند، الفرع، أو المستفيد..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 relative">
            <select
              className="w-full bg-surface text-on-surface font-body-md text-body-md px-space-md py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container appearance-none cursor-pointer"
              id="branchFilter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">جميع الفروع النشطة</option>
              {branchesList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-base">expand_more</span>
          </div>
          <div className="md:col-span-3 relative">
            <select
              className="w-full bg-surface text-on-surface font-body-md text-body-md px-space-md py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container appearance-none cursor-pointer"
              id="typeFilter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">جميع أنواع المصروفات</option>
              {TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-base">expand_more</span>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl bg-surface-container-low shadow-sm overflow-hidden mb-space-lg">
        <div className="p-space-md bg-surface-container-high/40 flex items-center justify-between border-b border-surface-container-highest">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[20px]">format_list_bulleted</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">جدول سندات المصروفات</h2>
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            إجمالي القيمة المعروضة: <strong className="text-primary font-mono font-bold">{fmtCurrency(totalAmount)} ر.س</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[780px]" id="expensesTable">
            <thead>
              <tr className="bg-surface-container font-label-md text-label-md text-on-surface-variant">
                <th className="py-3 px-space-md text-right">التاريخ</th>
                <th className="py-3 px-space-md text-right">رقم السند</th>
                <th className="py-3 px-space-md text-right">الفرع</th>
                <th className="py-3 px-space-md text-right">نوع المصروف</th>
                <th className="py-3 px-space-md text-right">بيان المصروف</th>
                <th className="py-3 px-space-md text-left">القيمة الإجمالية</th>
                <th className="py-3 px-space-md text-center">تفاصيل المصروف</th>
                <th className="py-3 px-space-md text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-highest/20 font-body-md text-body-md text-on-surface">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-outline">receipt_long</span>
                      <span>لا توجد مصروفات تطابق معايير البحث أو الفترة المحددة</span>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container/60 transition-colors expense-row">
                    <td className="py-3 px-space-md whitespace-nowrap text-on-surface-variant font-mono text-label-md">
                      {row.date}
                    </td>
                    <td className="py-3 px-space-md whitespace-nowrap font-mono font-bold text-primary text-label-md">
                      {row.invoice_number || `EXP-${row.id}`}
                    </td>
                    <td className="py-3 px-space-md font-label-lg whitespace-nowrap font-semibold">
                      {row.branch}
                    </td>
                    <td className="py-3 px-space-md whitespace-nowrap">
                      <span className={TYPE_BADGES[row.type]?.box || "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-variant text-on-surface-variant"}>
                        <span className={TYPE_BADGES[row.type]?.dot || "w-1.5 h-1.5 rounded-full bg-outline"}></span>
                        {row.type}
                      </span>
                    </td>
                    <td className="py-3 px-space-md max-w-[280px] truncate" title={row.desc}>
                      {row.desc}
                    </td>
                    <td className="py-3 px-space-md text-left font-bold text-on-surface font-mono whitespace-nowrap">
                      {fmtCurrency(row.total || row.amount)}{" "}
                      <span className="text-on-surface-variant text-label-sm font-normal">ر.س</span>
                    </td>
                    <td className="py-3 px-space-md whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedExpense(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary-container/20 hover:bg-primary-container/40 text-primary font-semibold text-label-sm transition-colors cursor-pointer"
                        title="عرض سند وتفاصيل هذا المصروف"
                      >
                        <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                        <span>عرض التفاصيل</span>
                      </button>
                    </td>
                    <td className="py-3 px-space-md whitespace-nowrap text-center">
                      <button
                        aria-label="حذف"
                        className="delete-btn w-8 h-8 rounded-lg inline-flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                        onClick={() => handleDelete(row.id)}
                        type="button"
                        title="حذف المصروف"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between p-space-md bg-surface-container-low font-body-sm text-body-sm text-on-surface-variant gap-space-sm border-t border-surface-container-highest/40">
          <div id="tableCountText">عرض {visible.length} من أصل {expenses.length} مصروف مسجل</div>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1 rounded bg-primary-container text-on-primary font-bold" type="button">1</button>
          </div>
        </div>
      </div>

      {/* Modal تفاصيل سند المصروف (مثل الفاتورة والتحويلات) */}
      {selectedExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedExpense(null); }}
        >
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
                      سند صرف مصروف
                    </h3>
                    <span className="font-mono text-primary font-bold px-2 py-0.5 rounded bg-primary-container/20 text-label-md">
                      {selectedExpense.invoice_number || `EXP-${selectedExpense.id}`}
                    </span>
                  </div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    الفرع: {selectedExpense.branch} | تاريخ الصرف: {selectedExpense.date}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
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
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">الفرع التابع له</span>
                  <strong className="font-body-md text-body-md text-on-surface">{selectedExpense.branch}</strong>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">تصنيف المصروف</span>
                  <div className="mt-1">
                    <span className={TYPE_BADGES[selectedExpense.type]?.box || "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-surface-variant text-on-surface"}>
                      <span className={TYPE_BADGES[selectedExpense.type]?.dot || "w-1.5 h-1.5 rounded-full bg-primary"}></span>
                      {selectedExpense.type}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">طريقة الدفع</span>
                  <strong className="font-body-md text-body-md text-on-surface">{selectedExpense.payment_method || "كاش"}</strong>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block">المستفيد / الجهة</span>
                  <strong className="font-body-md text-body-md text-on-surface truncate block" title={selectedExpense.payee}>
                    {selectedExpense.payee || "—"}
                  </strong>
                </div>
              </div>

              {/* Description Box */}
              <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">بيان ووصف المصروف:</span>
                <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                  {selectedExpense.desc || selectedExpense.description || "لا يوجد وصف مسجل"}
                </p>
              </div>

              {/* Financial Breakdown Table / Card */}
              <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-2">
                <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">تفاصيل المبالغ المالية:</span>
                <div className="flex justify-between items-center py-1 border-b border-surface-container-highest/60 text-body-md text-on-surface-variant">
                  <span>المبلغ الأساسي (قبل الضريبة):</span>
                  <span className="font-mono text-on-surface font-semibold">{fmtCurrency(selectedExpense.amount || selectedExpense.total)} ر.س</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-surface-container-highest/60 text-body-md text-on-surface-variant">
                  <span>ضريبة القيمة المضافة (15%):</span>
                  <span className="font-mono text-on-surface font-semibold">{fmtCurrency(selectedExpense.vat_amount || 0)} ر.س</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-headline-sm font-bold text-primary">
                  <span>إجمالي المصروف المدفوع:</span>
                  <span className="font-mono">{fmtCurrency(selectedExpense.total || selectedExpense.amount)} ر.س</span>
                </div>
              </div>

              {/* Additional Notes / Receipts */}
              {selectedExpense.notes && (
                <div className="bg-surface-container-lowest/50 border border-surface-container-highest p-space-md rounded-xl flex items-start gap-2 text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">info</span>
                  <div>
                    <span className="font-semibold block text-on-surface">ملاحظات ورقم السند:</span>
                    <span>{selectedExpense.notes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-space-md px-space-lg bg-surface-container-low border-t border-surface-container-highest flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>طباعة السند</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedExpense(null)}
                className="px-space-lg py-1.5 rounded-lg bg-primary-container text-on-primary-container hover:brightness-110 font-label-md text-label-md transition-colors font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-space-md"
          id="addExpenseModal"
          onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }}
        >
          <div className="relative w-full max-w-2xl bg-surface-container-low rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col border border-outline-variant/30">
            <div className="h-14 px-space-lg bg-surface-container flex items-center justify-between shrink-0">
              <div className="flex items-center gap-space-xs text-on-surface">
                <span className="material-symbols-outlined text-primary-container">receipt_long</span>
                <h2 className="font-headline-sm text-headline-sm font-bold">إضافة سند مصروف جديد</h2>
              </div>
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
                id="closeModalCross"
                onClick={closeAddModal}
                type="button"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form className="p-space-md sm:p-space-lg flex flex-col gap-space-md overflow-y-auto" id="addExpenseForm" onSubmit={handleAddSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant font-medium">اختيار الفرع <span className="text-error">*</span></label>
                  <div className="relative">
                    <select
                      className="w-full bg-surface text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container appearance-none cursor-pointer"
                      id="modalBranch"
                      required
                      value={modalBranch}
                      onChange={(e) => setModalBranch(e.target.value)}
                    >
                      {branchesList.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-base">expand_more</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant font-medium">نوع المصروف <span className="text-error">*</span></label>
                  <div className="relative">
                    <select
                      className="w-full bg-surface text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container appearance-none cursor-pointer"
                      id="modalType"
                      required
                      value={modalType}
                      onChange={(e) => setModalType(e.target.value)}
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-base">expand_more</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant font-medium">قيمة المصروف (قبل الضريبة) <span className="text-error">*</span></label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container"
                      id="modalAmount"
                      min="0"
                      placeholder="0.00"
                      required
                      step="0.01"
                      type="number"
                      value={modalAmount}
                      onChange={(e) => setModalAmount(e.target.value)}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">ر.س</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant font-medium">التاريخ <span className="text-error">*</span></label>
                  <input
                    className="w-full bg-surface text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container"
                    id="modalDate"
                    required
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant font-medium">الجهة المستفيدة / Payee</label>
                  <input
                    className="w-full bg-surface text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container"
                    placeholder="اسم الشركة أو الفرد المستفيد"
                    type="text"
                    value={modalPayee}
                    onChange={(e) => setModalPayee(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant font-medium">طريقة الدفع</label>
                  <select
                    className="w-full bg-surface text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container appearance-none cursor-pointer"
                    value={modalPaymentMethod}
                    onChange={(e) => setModalPaymentMethod(e.target.value)}
                  >
                    <option value="كاش">كاش (نقداً من الصندوق)</option>
                    <option value="تحويل بنكي">تحويل بنكي</option>
                    <option value="سداد إلكتروني">سداد إلكتروني / مدى</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant font-medium">بيان ووصف المصروف <span className="text-error">*</span></label>
                <input
                  className="w-full bg-surface text-on-surface font-body-md text-body-md px-space-md py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container"
                  id="modalDescription"
                  placeholder="مثال: فاتورة صيانة أجهزة التبريد للمطبخ"
                  required
                  type="text"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant font-medium">ملاحظات إضافية / رقم الفاتورة أو الإيصال</label>
                <textarea
                  className="w-full bg-surface text-on-surface font-body-md text-body-md p-space-md rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-container resize-none"
                  id="modalNotes"
                  placeholder="أدخل أية تفاصيل تعاقدية، رقم سند، أو إيصال هنا..."
                  rows={2}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-sm mt-space-xs border-t border-surface-container-highest/60">
                <button
                  className="px-space-md py-2 rounded-lg bg-surface hover:bg-surface-variant text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
                  id="closeModalBtn"
                  onClick={closeAddModal}
                  type="button"
                >
                  إلغاء
                </button>
                <button
                  className="px-space-lg py-2 rounded-lg bg-primary-container hover:brightness-110 text-on-primary font-label-md text-label-md transition-all shadow-sm active:scale-95 cursor-pointer font-bold"
                  type="submit"
                >
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
