"use client";

import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { createClient } from "../../../lib/supabase/client";
import { CURRENCY } from "../../../lib/config";

const supabase = createClient();

const FILTER_ON = "status-btn active px-3.5 py-1.5 rounded-lg font-label-md text-label-md bg-primary text-on-primary font-semibold transition-all cursor-pointer whitespace-nowrap";
const FILTER_OFF = "status-btn px-3.5 py-1.5 rounded-lg font-label-md text-label-md bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all cursor-pointer whitespace-nowrap";

const BADGE_DONE = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm";
const DOT_DONE = "w-1.5 h-1.5 rounded-full bg-tertiary";
const BADGE_SECONDARY = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-container/20 text-secondary font-label-sm text-label-sm";
const DOT_SECONDARY = "w-1.5 h-1.5 rounded-full bg-secondary";
const BADGE_PRIMARY = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary-container/20 text-primary font-label-sm text-label-sm";
const DOT_PRIMARY = "w-1.5 h-1.5 rounded-full bg-primary";
const BADGE_ERROR = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-error-container/20 text-error font-label-sm text-label-sm";
const DOT_ERROR = "w-1.5 h-1.5 rounded-full bg-error";

const MODAL_OPEN = "fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4";
const MODAL_CLOSED = "fixed inset-0 z-50 hidden items-center justify-center bg-surface-container-lowest/80 backdrop-blur-sm p-4";

export default function PurchasesPage() {
  const [invoices, setInvoices] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [modalMode, setModalMode] = useState(null); // 'create' | 'review' | null
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Form states for creating purchase order
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [nextItemId, setNextItemId] = useState(1);

  // Form state for review
  const [reviewLines, setReviewLines] = useState([]);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, itemsRes] = await Promise.all([
        api.rpc("inventory_get_documents", { p_doc_type: "supply_orders", p_limit: 100 }),
        api.query(supabase.from('inventory_items').select('id, name, avg_cost').eq('is_active', true))
      ]);
      setInvoices(invRes || []);
      setInventoryItems(itemsRes || []);
    } catch (err) {
      console.error(err);
      alert("خطأ أثناء تحميل البيانات: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const query = search.trim().toLowerCase();
  const visible = invoices.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch = !query || r.number.toLowerCase().includes(query) || (r.supplier_name && r.supplier_name.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const grandTotal = items.reduce((sum, it) => sum + (parseFloat(it.qty) || 0) * (parseFloat(it.price) || 0), 0);

  function handleAdd() {
    setSupplierName("");
    setSupplierPhone("");
    setExpectedDate("");
    setNotes("");
    setItems([{ id: Date.now(), item_id: "", qty: "1", price: "0" }]);
    setModalMode("create");
  }

  function handleReview(row) {
    setSelectedInvoice(row);
    // Initialize review lines based on requested lines
    setReviewLines(row.lines.map(l => ({
      line_id: l.id,
      item_id: l.item_id,
      qty_approved: l.qty_requested,
      unit_cost: l.unit_cost
    })));
    setRejectionReason("");
    setModalMode("review");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedInvoice(null);
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) closeModal();
  }

  function addItem() {
    setItems([...items, { id: Date.now(), item_id: "", qty: "1", price: "0" }]);
  }

  function removeItem(id) {
    if (items.length > 1) {
      setItems(items.filter((it) => it.id !== id));
    } else {
      alert("يجب الإبقاء على بند واحد على الأقل في الفاتورة");
    }
  }

  function updateItem(id, field, value) {
    setItems(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!supplierName) {
      alert("الرجاء إدخال اسم المورد");
      return;
    }
    const cleanLines = items.filter(it => it.item_id && parseFloat(it.qty) > 0).map(it => ({
      item_id: it.item_id,
      qty_requested: parseFloat(it.qty),
      unit_cost: parseFloat(it.price) || 0
    }));

    if (cleanLines.length === 0) {
      alert("الرجاء إضافة أصناف صالحة");
      return;
    }

    try {
      await api.rpc("create_supply_order", {
        p_client_id: crypto.randomUUID(),
        p_supplier_name: supplierName,
        p_supplier_phone: supplierPhone || null,
        p_expected_date: expectedDate || null,
        p_priority: 'normal',
        p_notes: notes || null,
        p_lines: cleanLines
      });
      alert("تم إنشاء طلب التوريد بنجاح");
      closeModal();
      loadData();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    try {
      await api.rpc("review_supply_order", {
        p_order_id: selectedInvoice.id,
        p_expected_version: selectedInvoice.version,
        p_decision: "approved",
        p_rejection_reason: null,
        p_lines: reviewLines
      });
      alert("تمت الموافقة بنجاح");
      closeModal();
      loadData();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      alert("الرجاء إدخال سبب الرفض");
      return;
    }
    try {
      await api.rpc("review_supply_order", {
        p_order_id: selectedInvoice.id,
        p_expected_version: selectedInvoice.version,
        p_decision: "rejected",
        p_rejection_reason: rejectionReason,
        p_lines: null
      });
      alert("تم رفض الطلب بنجاح");
      closeModal();
      loadData();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const getItemName = (id) => {
    return inventoryItems.find(i => i.id === id)?.name || id;
  };

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
          <p className="font-body-md text-body-md text-on-surface-variant">إدارة طلبات الشراء والموافقة عليها</p>
        </div>
        <div className="w-full sm:w-auto">
          <button type="button" onClick={handleAdd} className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg shadow-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>إنشاء طلب توريد جديد</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md mb-space-md bg-surface-container p-space-md rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-xl">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px] pointer-events-none">search</span>
          <input
            className="w-full pr-10 pl-space-md py-2.5 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md border-0 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
            placeholder="بحث برقم الطلب أو اسم المورد..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 lg:pb-0 w-full lg:w-auto">
          <button type="button" onClick={() => setStatusFilter("all")} className={statusFilter === "all" ? FILTER_ON : FILTER_OFF}>الكل</button>
          <button type="button" onClick={() => setStatusFilter("pending_review")} className={statusFilter === "pending_review" ? FILTER_ON : FILTER_OFF}>بانتظار المراجعة</button>
          <button type="button" onClick={() => setStatusFilter("approved")} className={statusFilter === "approved" ? FILTER_ON : FILTER_OFF}>مُعتمد</button>
          <button type="button" onClick={() => setStatusFilter("received")} className={statusFilter === "received" ? FILTER_ON : FILTER_OFF}>مستلم</button>
          <button type="button" onClick={() => setStatusFilter("rejected")} className={statusFilter === "rejected" ? FILTER_ON : FILTER_OFF}>مرفوض</button>
        </div>
      </div>

      {/* Table */}
      <div className="w-full bg-surface-container rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-surface-container-high text-on-surface-variant font-label-md text-label-md">
                <th className="py-3.5 px-space-lg text-right">رقم الطلب</th>
                <th className="py-3.5 px-space-md text-right">المورد</th>
                <th className="py-3.5 px-space-md text-right">تاريخ الطلب</th>
                <th className="py-3.5 px-space-md text-center">الحالة</th>
                <th className="py-3.5 px-space-lg text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high text-body-md">
              {loading ? (
                <tr><td colSpan="5" className="text-center py-6 text-on-surface-variant">جاري التحميل...</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-6 text-on-surface-variant">لا توجد طلبات مطابقة</td></tr>
              ) : visible.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-high/60 transition-colors">
                  <td className="py-4 px-space-lg font-mono text-primary font-bold">{row.number}</td>
                  <td className="py-4 px-space-md font-semibold text-on-surface">{row.supplier_name}</td>
                  <td className="py-4 px-space-md text-on-surface-variant text-body-sm">{new Date(row.created_at).toLocaleDateString()}</td>
                  <td className="py-4 px-space-md text-center">
                    {row.status === 'pending_review' ? (
                      <span className={BADGE_SECONDARY}><span className={DOT_SECONDARY}></span>بانتظار المراجعة</span>
                    ) : row.status === 'approved' ? (
                      <span className={BADGE_PRIMARY}><span className={DOT_PRIMARY}></span>مُعتمد (جاهز للاستلام)</span>
                    ) : row.status === 'received' ? (
                      <span className={BADGE_DONE}><span className={DOT_DONE}></span>مستلم في المخزن</span>
                    ) : row.status === 'rejected' ? (
                      <span className={BADGE_ERROR}><span className={DOT_ERROR}></span>مرفوض</span>
                    ) : (
                      <span className={BADGE_SECONDARY}>{row.status}</span>
                    )}
                  </td>
                  <td className="py-4 px-space-lg text-left">
                    {row.status === 'pending_review' ? (
                      <button type="button" onClick={() => handleReview(row)} className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm transition-colors cursor-pointer inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">fact_check</span> مراجعة
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleReview(row)} className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm transition-colors cursor-pointer inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">visibility</span> عرض
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {modalMode === "create" && (
        <div className={MODAL_OPEN} onClick={handleBackdropClick}>
          <div className="w-full max-w-4xl bg-surface-container rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-space-lg py-space-md bg-surface-container-low shrink-0 border-b border-surface-container-high">
              <div className="flex items-center gap-space-sm text-primary">
                <span className="material-symbols-outlined text-[24px]">add_shopping_cart</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">إنشاء طلب توريد جديد</h2>
              </div>
              <button type="button" onClick={closeModal} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-y-auto p-space-lg gap-space-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">اسم المورد *</label>
                  <input type="text" required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="اسم المورد..." />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">رقم هاتف المورد</label>
                  <input type="text" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary" dir="ltr" placeholder="05xxxxxxxx" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">تاريخ التوريد المتوقع *</label>
                  <input type="date" required value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">ملاحظات عامة</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary" placeholder="أي ملاحظات..." />
                </div>
              </div>

              <div className="flex flex-col gap-space-sm border-t border-surface-container-high pt-space-md">
                <div className="flex items-center justify-between">
                  <span className="font-label-lg font-bold">الأصناف المطلوبة</span>
                  <button type="button" onClick={addItem} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-sm cursor-pointer">
                    <span className="material-symbols-outlined text-[16px]">add</span> إضافة صنف
                  </button>
                </div>
                <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 overflow-hidden">
                  <table className="w-full text-right">
                    <thead className="bg-surface-container-high">
                      <tr className="text-on-surface-variant font-label-sm">
                        <th className="py-2 px-3">الصنف</th>
                        <th className="py-2 px-3 w-32">الكمية</th>
                        <th className="py-2 px-3 w-32">سعر الوحدة</th>
                        <th className="py-2 px-3 w-32 text-left">الإجمالي</th>
                        <th className="py-2 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high">
                      {items.map((it) => (
                        <tr key={it.id}>
                          <td className="py-2 px-3">
                            <select
                              required
                              className="w-full bg-surface-container text-on-surface py-1.5 px-2 rounded border-0 focus:outline-none focus:ring-1 focus:ring-primary"
                              value={it.item_id}
                              onChange={(e) => updateItem(it.id, "item_id", e.target.value)}
                            >
                              <option value="">-- اختر --</option>
                              {inventoryItems.map(inv => (
                                <option key={inv.id} value={inv.id}>{inv.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input type="number" min="0.1" step="0.1" required className="w-full bg-surface-container text-on-surface py-1.5 px-2 rounded border-0 focus:outline-none text-center" value={it.qty} onChange={(e) => updateItem(it.id, "qty", e.target.value)} />
                          </td>
                          <td className="py-2 px-3">
                            <input type="number" min="0" step="0.01" className="w-full bg-surface-container text-on-surface py-1.5 px-2 rounded border-0 focus:outline-none text-center" value={it.price} onChange={(e) => updateItem(it.id, "price", e.target.value)} />
                          </td>
                          <td className="py-2 px-3 text-left font-mono font-bold">
                            {((parseFloat(it.qty)||0)*(parseFloat(it.price)||0)).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button type="button" onClick={() => removeItem(it.id)} className="p-1 rounded text-on-surface-variant hover:text-error">
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between p-space-md rounded-lg bg-surface-container-high/50 mt-2">
                  <span className="font-headline-sm font-bold">إجمالي الفاتورة التقريبي:</span>
                  <span className="font-mono text-headline-sm text-primary font-bold">{grandTotal.toFixed(2)} {CURRENCY}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-md mt-auto border-t border-surface-container-high">
                <button type="button" onClick={closeModal} className="px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors font-label-lg">إلغاء</button>
                <button type="submit" className="px-space-xl py-2 rounded-lg bg-primary text-on-primary font-bold shadow-sm hover:brightness-110 transition-colors font-label-lg">حفظ وإرسال الطلب</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW / VIEW MODAL */}
      {modalMode === "review" && selectedInvoice && (
        <div className={MODAL_OPEN} onClick={handleBackdropClick}>
          <div className="w-full max-w-4xl bg-surface-container rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-space-lg py-space-md bg-surface-container-low shrink-0 border-b border-surface-container-high">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[24px] text-tertiary">fact_check</span>
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {selectedInvoice.status === 'pending_review' ? 'مراجعة طلب التوريد' : 'تفاصيل طلب التوريد'}
                  </h2>
                  <p className="font-body-sm text-on-surface-variant">رقم الطلب: <span className="font-mono">{selectedInvoice.number}</span></p>
                </div>
              </div>
              <button type="button" onClick={closeModal} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            <div className="flex flex-col flex-1 overflow-y-auto p-space-lg gap-space-md">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md bg-surface-container-lowest p-space-md rounded-lg border border-outline-variant/30">
                <div>
                  <div className="text-xs text-on-surface-variant mb-1">المورد</div>
                  <div className="font-bold text-on-surface">{selectedInvoice.supplier_name}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant mb-1">تاريخ الإنشاء</div>
                  <div className="font-bold text-on-surface">{new Date(selectedInvoice.created_at).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant mb-1">تاريخ التوريد المتوقع</div>
                  <div className="font-bold text-on-surface">{selectedInvoice.expected_date || 'غير محدد'}</div>
                </div>
                <div>
                  <div className="text-xs text-on-surface-variant mb-1">الحالة</div>
                  <div className="font-bold text-on-surface">{selectedInvoice.status}</div>
                </div>
              </div>
              
              {selectedInvoice.notes && (
                <div className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30 text-sm">
                  <span className="font-bold text-on-surface-variant">ملاحظات أمين المخزن: </span>
                  {selectedInvoice.notes}
                </div>
              )}

              {selectedInvoice.status === 'rejected' && (
                <div className="bg-error-container/20 p-3 rounded-lg border border-error/30 text-sm text-error">
                  <span className="font-bold">سبب الرفض: </span>
                  {selectedInvoice.rejection_reason}
                </div>
              )}

              <div className="mt-2">
                <h3 className="font-label-lg font-bold mb-2">السطور والأصناف</h3>
                <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/40 overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-surface-container-high">
                      <tr className="text-on-surface-variant font-label-sm">
                        <th className="py-2 px-3">الصنف</th>
                        <th className="py-2 px-3 text-center">الكمية المطلوبة</th>
                        {selectedInvoice.status === 'pending_review' && <th className="py-2 px-3 text-center text-primary bg-primary/5">الكمية المعتمدة</th>}
                        {selectedInvoice.status !== 'pending_review' && <th className="py-2 px-3 text-center">الكمية المعتمدة</th>}
                        {selectedInvoice.status === 'received' && <th className="py-2 px-3 text-center text-tertiary">الكمية المستلمة</th>}
                        <th className="py-2 px-3 text-center">سعر الوحدة</th>
                        <th className="py-2 px-3 text-left">الإجمالي (حسب المعتمد)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high">
                      {selectedInvoice.lines.map((line, idx) => {
                        const reviewLine = reviewLines.find(r => r.line_id === line.id) || {};
                        const approvedQty = selectedInvoice.status === 'pending_review' ? reviewLine.qty_approved : line.qty_approved;
                        const uCost = selectedInvoice.status === 'pending_review' ? reviewLine.unit_cost : line.unit_cost;
                        
                        return (
                          <tr key={line.id}>
                            <td className="py-2 px-3 font-semibold">{getItemName(line.item_id)}</td>
                            <td className="py-2 px-3 text-center text-on-surface-variant font-mono">{line.qty_requested}</td>
                            
                            {selectedInvoice.status === 'pending_review' ? (
                              <td className="py-1 px-2 bg-primary/5">
                                <input 
                                  type="number" min="0" step="0.1" 
                                  className="w-20 bg-surface-container-lowest text-on-surface py-1 rounded border border-primary/30 focus:outline-none text-center mx-auto block" 
                                  value={reviewLine.qty_approved} 
                                  onChange={(e) => {
                                    const newLines = [...reviewLines];
                                    newLines[idx].qty_approved = parseFloat(e.target.value) || 0;
                                    setReviewLines(newLines);
                                  }} 
                                />
                              </td>
                            ) : (
                              <td className="py-2 px-3 text-center font-mono font-bold text-primary">{line.qty_approved}</td>
                            )}

                            {selectedInvoice.status === 'received' && (
                              <td className="py-2 px-3 text-center font-mono font-bold text-tertiary">{line.qty_received}</td>
                            )}

                            {selectedInvoice.status === 'pending_review' ? (
                              <td className="py-1 px-2 text-center">
                                <input 
                                  type="number" min="0" step="0.01" 
                                  className="w-24 bg-surface-container text-on-surface py-1 rounded border-0 focus:outline-none text-center mx-auto block" 
                                  value={reviewLine.unit_cost} 
                                  onChange={(e) => {
                                    const newLines = [...reviewLines];
                                    newLines[idx].unit_cost = parseFloat(e.target.value) || 0;
                                    setReviewLines(newLines);
                                  }} 
                                />
                              </td>
                            ) : (
                              <td className="py-2 px-3 text-center font-mono">{line.unit_cost}</td>
                            )}
                            
                            <td className="py-2 px-3 text-left font-mono font-bold">
                              {((parseFloat(approvedQty)||0)*(parseFloat(uCost)||0)).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedInvoice.status === 'pending_review' && (
                <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t border-surface-container-high">
                  <label className="font-label-md text-error font-bold">في حالة الرفض، يرجى كتابة السبب:</label>
                  <textarea 
                    rows={2} 
                    className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-error/30 focus:outline-none focus:ring-1 focus:ring-error" 
                    placeholder="سبب الرفض..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-space-md border-t border-surface-container-high bg-surface-container-low shrink-0">
              {selectedInvoice.status === 'pending_review' ? (
                <>
                  <button type="button" onClick={handleReject} className="px-space-lg py-2 rounded-lg bg-error-container hover:bg-error text-on-error-container hover:text-surface-container-lowest font-bold transition-colors">
                    رفض الطلب
                  </button>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={closeModal} className="px-space-md py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors">إلغاء</button>
                    <button type="button" onClick={handleApprove} className="px-space-xl py-2 rounded-lg bg-primary text-on-primary font-bold shadow-sm hover:brightness-110 transition-colors">
                      اعتماد والموافقة
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex justify-end">
                  <button type="button" onClick={closeModal} className="px-space-lg py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest transition-colors font-bold">إغلاق</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
