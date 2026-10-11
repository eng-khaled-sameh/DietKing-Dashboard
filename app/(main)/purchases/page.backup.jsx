"use client";
import { useState } from "react";

function fmt(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ر.س";
}

const FILTER_ON = "status-btn active px-3.5 py-1.5 rounded-lg font-label-md text-label-md bg-primary text-on-primary font-semibold transition-all cursor-pointer whitespace-nowrap";
const FILTER_OFF = "status-btn px-3.5 py-1.5 rounded-lg font-label-md text-label-md bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all cursor-pointer whitespace-nowrap";

const BADGE_DONE = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm";
const DOT_DONE = "w-1.5 h-1.5 rounded-full bg-tertiary";
const BADGE_SECONDARY = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-container/20 text-secondary font-label-sm text-label-sm";
const DOT_SECONDARY = "w-1.5 h-1.5 rounded-full bg-secondary";
const BADGE_PRIMARY = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-container/20 text-primary font-label-sm text-label-sm";
const DOT_PRIMARY = "w-1.5 h-1.5 rounded-full bg-primary";

const MODAL_OPEN = "fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4";
const MODAL_CLOSED = "fixed inset-0 z-50 hidden items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4";

const PRODUCTS = [
  { name: "صدر دجاج طازج", price: 28 },
  { name: "فيليه سلمون نرويجي", price: 85 },
  { name: "لحم بتلو صحي", price: 60 },
  { name: "بهارات وزيوت صحية", price: 35 },
  { name: "علب تغليف صحية", price: 1.5 },
];

const SUPPLIERS = ["شركة الدواجن الوطنية", "أسماك الخليج الطازجة", "مزارع الخضار الطبيعية", "شركة المراعي الطازجة"];

const INITIAL_INVOICES = [
  { id: "#PO-2024-001", supplier: "شركة الدواجن الوطنية", date: "2024-10-24", total: "8,450 ر.س", status: "completed", badgeClass: BADGE_DONE, dotClass: DOT_DONE, badgeLabel: "مكتملة / مستلمة" },
  { id: "#PO-2024-002", supplier: "أسماك الخليج الطازجة", date: "2024-10-23", total: "12,600 ر.س", status: "pending", badgeClass: BADGE_SECONDARY, dotClass: DOT_SECONDARY, badgeLabel: "قيد المراجعة" },
  { id: "#PO-2024-003", supplier: "مزارع الخضار الطبيعية", date: "2024-10-21", total: "3,240 ر.س", status: "completed", badgeClass: BADGE_DONE, dotClass: DOT_DONE, badgeLabel: "مكتملة / مستلمة" },
  { id: "#PO-2024-004", supplier: "شركة المراعي الطازجة", date: "2024-10-20", total: "5,820 ر.س", status: "review", badgeClass: BADGE_PRIMARY, dotClass: DOT_PRIMARY, badgeLabel: "معلقة" },
  { id: "#PO-2024-005", supplier: "شركة الدواجن الوطنية", date: "2024-10-18", total: "9,100 ر.س", status: "completed", badgeClass: BADGE_DONE, dotClass: DOT_DONE, badgeLabel: "مكتملة / مستلمة" },
];

export default function PurchasesPage() {
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("فاتورة شراء جديدة");
  const [supplier, setSupplier] = useState("");
  const [items, setItems] = useState([{ id: 1, product: "صدر دجاج طازج", qty: "50", price: "28" }]);
  const [nextItemId, setNextItemId] = useState(2);

  const query = search.trim().toLowerCase();
  const visible = invoices.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch = !query || r.id.toLowerCase().includes(query) || r.supplier.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const grandTotal = items.reduce((sum, it) => sum + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0);

  function handleAdd() {
    setModalTitle("فاتورة شراء جديدة");
    setSupplier("");
    setModalOpen(true);
  }

  function handleEdit(row) {
    setModalTitle("تفاصيل الفاتورة: " + row.id);
    setSupplier(row.supplier);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) closeModal();
  }

  function handleDelete(id) {
    if (window.confirm("هل أنت متأكد من حذف فاتورة الشراء هذه؟")) {
      setInvoices(invoices.filter((r) => r.id !== id));
    }
  }

  function addItem() {
    setItems([...items, { id: nextItemId, product: PRODUCTS[0].name, qty: "10", price: "28" }]);
    setNextItemId(nextItemId + 1);
  }

  function removeItem(id) {
    if (items.length > 1) {
      setItems(items.filter((it) => it.id !== id));
    } else {
      alert("يجب الإبقاء على بند واحد على الأقل في الفاتورة");
    }
  }

  function changeProduct(id, name) {
    const p = PRODUCTS.find((x) => x.name === name);
    setItems(items.map((it) => (it.id === id ? { ...it, product: name, price: String(p ? p.price : 0) } : it)));
  }

  function changeQty(id, value) {
    setItems(items.map((it) => (it.id === id ? { ...it, qty: value } : it)));
  }

  function changePrice(id, value) {
    setItems(items.map((it) => (it.id === id ? { ...it, price: value } : it)));
  }

  function handleSave(e) {
    e.preventDefault();
    if (!supplier) {
      alert("الرجاء اختيار المورد");
      return;
    }
    const newRow = {
      id: "#PO-2024-" + Math.floor(100 + Math.random() * 900),
      supplier: supplier,
      date: new Date().toISOString().split("T")[0],
      total: fmt(grandTotal),
      status: "pending",
      badgeClass: BADGE_SECONDARY,
      dotClass: DOT_SECONDARY,
      badgeLabel: "قيد التجهيز / معلقة",
    };
    setInvoices([newRow, ...invoices]);
    closeModal();
  }

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">المشتريات</h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span>المستودع الوجهة: المخزن الرئيسي</span>
            </div>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">إدارة فواتير التوريد والمشتريات للمخزن الرئيسي</p>
        </div>
        <div className="w-full sm:w-auto">
          <button type="button" onClick={handleAdd} className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>فاتورة شراء جديدة +</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md mb-space-md bg-surface-container p-space-md rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-xl">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px] pointer-events-none">search</span>
          <input
            id="search-input"
            className="w-full pr-10 pl-space-md py-2.5 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md border-0 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            placeholder="بحث برقم الفاتورة أو اسم المورد..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div id="status-filters" className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 w-full lg:w-auto">
          <button type="button" onClick={() => setStatusFilter("all")} className={statusFilter === "all" ? FILTER_ON : FILTER_OFF}>الكل</button>
          <button type="button" onClick={() => setStatusFilter("completed")} className={statusFilter === "completed" ? FILTER_ON : FILTER_OFF}>مكتملة</button>
          <button type="button" onClick={() => setStatusFilter("pending")} className={statusFilter === "pending" ? FILTER_ON : FILTER_OFF}>معلقة</button>
          <button type="button" onClick={() => setStatusFilter("review")} className={statusFilter === "review" ? FILTER_ON : FILTER_OFF}>قيد المراجعة</button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full bg-surface-container rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table id="purchases-table" className="w-full text-right border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-surface-container-high text-on-surface-variant font-label-md text-label-md">
                <th className="py-3.5 px-space-lg text-right">رقم الفاتورة</th>
                <th className="py-3.5 px-space-md text-right">المورد</th>
                <th className="py-3.5 px-space-md text-right">التاريخ</th>
                <th className="py-3.5 px-space-md text-left">إجمالي الفاتورة</th>
                <th className="py-3.5 px-space-md text-center">الحالة</th>
                <th className="py-3.5 px-space-lg text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody id="purchases-body" className="divide-y-0 text-body-md">
              {visible.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-high/60 transition-colors purchase-row">
                  <td className="py-4 px-space-lg font-mono text-primary font-bold">{row.id}</td>
                  <td className="py-4 px-space-md font-semibold text-on-surface">{row.supplier}</td>
                  <td className="py-4 px-space-md text-on-surface-variant text-body-sm">{row.date}</td>
                  <td className="py-4 px-space-md text-left font-mono font-bold text-on-surface">{row.total}</td>
                  <td className="py-4 px-space-md text-center">
                    <span className={row.badgeClass}>
                      <span className={row.dotClass}></span>
                      <span>{row.badgeLabel}</span>
                    </span>
                  </td>
                  <td className="py-4 px-space-lg text-center">
                    <div className="inline-flex items-center gap-space-xs">
                      <button type="button" onClick={() => handleEdit(row)} className="px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm transition-colors cursor-pointer">
                        عرض / تعديل
                      </button>
                      <button type="button" title="حذف" onClick={() => handleDelete(row.id)} className="p-1.5 rounded-lg text-error hover:bg-error-container/20 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <div className="py-space-xl text-center" id="no-results">
            <span className="material-symbols-outlined text-[40px] text-on-surface-variant/40 mb-2 block">inventory_2</span>
            <p className="font-body-md text-body-md text-on-surface-variant">لا توجد فواتير مطابقة لخيارات البحث</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <div id="purchase-modal" className={modalOpen ? MODAL_OPEN : MODAL_CLOSED} onClick={handleBackdropClick}>
        <div className="w-full max-w-3xl bg-surface-container rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-space-lg py-space-md bg-surface-container-low shrink-0">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">receipt_long</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="modal-title" className="font-headline-sm text-headline-sm text-on-surface font-bold">{modalTitle}</h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm">المخزن المستلم: المخزن الرئيسي</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">تسجيل وتوريد خامات ومكونات الوجبات الصحية</p>
              </div>
            </div>
            <button type="button" onClick={closeModal} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Modal Body */}
          <form id="invoice-form" onSubmit={handleSave} className="flex flex-col flex-1 overflow-y-auto p-space-lg gap-space-lg">
            {/* Supplier */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="supplier-input" className="font-label-md text-label-md text-on-surface-variant">اختيار المورد المعتمد</label>
              <select
                id="supplier-input"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md py-2.5 px-space-md rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
              >
                <option value="">-- اختر المورد --</option>
                {SUPPLIERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Items */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-label-lg text-label-lg text-on-surface font-semibold">قائمة المنتجات والمكونات</span>
                <button type="button" onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm text-label-sm transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>إضافة منتج +</span>
                </button>
              </div>
              <div className="bg-surface-container-lowest rounded-lg p-space-sm overflow-x-auto shadow-inner">
                <table id="modal-items-table" className="w-full text-right min-w-[480px]">
                  <thead>
                    <tr className="text-on-surface-variant font-label-sm text-label-sm">
                      <th className="py-2 px-2">المنتج</th>
                      <th className="py-2 px-2 w-28">الكمية</th>
                      <th className="py-2 px-2 w-32">سعر الوحدة (ر.س)</th>
                      <th className="py-2 px-2 w-32 text-left">الإجمالي الفرعي</th>
                      <th className="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody id="items-container" className="divide-y-0">
                    {items.map((it) => (
                      <tr key={it.id} className="item-row">
                        <td className="py-2 px-2">
                          <select
                            className="product-select w-full bg-surface-container text-on-surface font-body-sm text-body-sm py-2 px-2 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
                            value={it.product}
                            onChange={(e) => changeProduct(it.id, e.target.value)}
                          >
                            {PRODUCTS.map((p) => (
                              <option key={p.name} value={p.name}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            className="qty-input w-full bg-surface-container text-on-surface font-mono font-body-sm text-body-sm py-2 px-2 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary text-center"
                            value={it.qty}
                            onChange={(e) => changeQty(it.id, e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            className="price-input w-full bg-surface-container text-on-surface font-mono font-body-sm text-body-sm py-2 px-2 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary text-center"
                            value={it.price}
                            onChange={(e) => changePrice(it.id, e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2 text-left">
                          <span className="subtotal-cell font-mono font-bold text-on-surface">{fmt((parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0))}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button type="button" title="حذف البند" onClick={() => removeItem(it.id)} className="p-1 rounded text-on-surface-variant hover:text-error transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grand Total */}
            <div className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-high/70">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">payments</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">إجمالي الفاتورة:</span>
              </div>
              <div id="invoice-total" className="text-left font-mono font-display-lg text-headline-xl text-primary font-bold">{fmt(grandTotal)}</div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-space-sm pt-space-xs mt-auto">
              <button type="button" onClick={closeModal} className="px-space-md py-2.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest font-label-lg text-label-lg transition-colors cursor-pointer">
                إلغاء
              </button>
              <button type="submit" className="px-space-xl py-2.5 rounded-lg bg-primary-container hover:brightness-110 text-on-primary font-label-lg text-label-lg font-bold shadow-sm transition-all cursor-pointer">
                حفظ الفاتورة
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
