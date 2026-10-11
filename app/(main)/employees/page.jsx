"use client";

import { useState, useEffect } from "react";
import { CURRENCY } from "../../../lib/config";
import { api } from "../../../lib/api";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [deductionsBonuses, setDeductionsBonuses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [modal, setModal] = useState(null); // null | "leave" | "deduction" | "reward" | "history" | "edit"
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [historyTab, setHistoryTab] = useState("leaves"); // "leaves" | "deductions" | "rewards" | "attendance"
  const [attendanceMonthOffset, setAttendanceMonthOffset] = useState(0); // 0 = current, 1 = prev month, 2 = 2 months ago

  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, branchRes, leavesRes, deductionsRes] = await Promise.all([
        api.rpc("hr_list_employees", { p_limit: 100 }),
        api.rpc("hr_list_branches"),
        api.rpc("hr_list_leave_requests", { p_limit: 100 }),
        api.rpc("hr_list_deduction_bonuses", { p_limit: 100 })
      ]);
      setEmployees(empRes?.items || []);
      setBranches(branchRes || []);
      setLeaves(leavesRes || []);
      setDeductionsBonuses(deductionsRes || []);
    } catch (err) {
      console.error(err);
      // alert("حدث خطأ أثناء تحميل البيانات: " + err.message);
    }
    setLoading(false);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchBranch = branchFilter === "all" || emp.branch_id === branchFilter;
    const matchQuery = emp.full_name.toLowerCase().includes(query.trim().toLowerCase()) || emp.code.toLowerCase().includes(query.trim().toLowerCase());
    return matchBranch && matchQuery;
  });

  const empLeaves = historyEmployee ? leaves.filter(l => l.employee_id === historyEmployee.id) : [];
  const empDeductions = historyEmployee ? deductionsBonuses.filter(d => d.employee_id === historyEmployee.id && d.type === 'deduction') : [];
  const empRewards = historyEmployee ? deductionsBonuses.filter(d => d.employee_id === historyEmployee.id && d.type === 'bonus') : [];

  const loadAttendance = async (empId, offset = 0) => {
    try {
      const d = new Date();
      d.setMonth(d.getMonth() - offset);
      const res = await api.rpc("hr_get_monthly_attendance", {
        p_employee_id: empId,
        p_year: d.getFullYear(),
        p_month: d.getMonth() + 1
      });
      setAttendance(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (modal === "history" && historyTab === "attendance" && historyEmployee) {
      loadAttendance(historyEmployee.id, attendanceMonthOffset);
    }
  }, [modal, historyTab, historyEmployee, attendanceMonthOffset]);

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.rpc("hr_create_leave_request", {
        p: {
          employee_id: formData.employee_id,
          requested_from: 'hr',
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason
        }
      });
      alert("تم طلب الإجازة بنجاح");
      setModal(null);
      setFormData({});
      loadData();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const handleDeductionSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.rpc("hr_create_deduction_bonus", {
        p: {
          employee_id: formData.employee_id,
          requested_from: 'hr',
          type: 'deduction',
          amount_type: 'cash',
          cash_amount: formData.cash_amount,
          notes: formData.reason + (formData.notes ? ' - ' + formData.notes : '')
        }
      });
      alert("تمت إضافة الخصم بنجاح");
      setModal(null);
      setFormData({});
      loadData();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const handleRewardSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.rpc("hr_create_deduction_bonus", {
        p: {
          employee_id: formData.employee_id,
          requested_from: 'hr',
          type: 'bonus',
          amount_type: 'cash',
          cash_amount: formData.cash_amount,
          notes: formData.reason + (formData.notes ? ' - ' + formData.notes : '')
        }
      });
      alert("تمت إضافة المكافأة بنجاح");
      setModal(null);
      setFormData({});
      loadData();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.rpc("hr_update_employee", {
        p_id: formData.id,
        p: {
          full_name: formData.full_name,
          job_role: formData.job_role,
          branch_id: formData.branch_id || null,
          birth_date: formData.birth_date || null,
          hire_date: formData.hire_date || null,
          basic_salary: formData.basic_salary,
          allowances: formData.allowances,
          transport_allowance: formData.transport_allowance,
          phone: formData.phone || null,
          qualification: formData.qualification || null,
          notes: formData.notes || null,
        }
      });
      alert("تم تعديل بيانات الموظف بنجاح");
      setModal(null);
      setFormData({});
      loadData();
    } catch (err) {
      alert("خطأ أثناء التعديل (قد تحتاج لرفع التحديثات على قاعدة البيانات أولاً): " + err.message);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm("هل أنت متأكد من أرشفة/حذف هذا الموظف؟")) return;
    try {
      await api.rpc("hr_update_employee_status", {
        p_id: emp.id,
        p_status: "archived",
        p_reason: "حذف من النظام"
      });
      alert("تم حذف الموظف بنجاح");
      loadData();
    } catch (err) {
      alert("خطأ: " + err.message);
    }
  };

  const roleLabels = {
    'cashier': 'كاشير',
    'accountant': 'محاسب',
    'hr': 'موارد بشرية',
    'worker': 'عامل',
    'driver': 'سائق',
    'storekeeper': 'أمين مستودع',
    'chef': 'طاهي',
    'kitchen_worker': 'عامل مطبخ',
    'branch_manager': 'مدير فرع'
  };

  return (
    <>
      <div className="flex flex-col w-full">
        <div className="flex flex-col gap-space-lg py-space-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex flex-col">
              <h1 className="font-headline-xl text-headline-xl text-on-surface">الموظفين</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">إدارة الكوادر التشغيلية والوظيفية لفروع سلسلة دايت كينج</p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-space-xs sm:gap-space-sm w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setModal("leave")}
                className="inline-flex items-center justify-center gap-space-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40 px-2 sm:px-space-md py-2 sm:py-space-sm rounded-lg font-label-lg text-xs sm:text-label-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[17px] sm:text-[19px] text-tertiary">event_note</span>
                <span>طلب إجازة</span>
              </button>
              <button
                type="button"
                onClick={() => setModal("deduction")}
                className="inline-flex items-center justify-center gap-space-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40 px-2 sm:px-space-md py-2 sm:py-space-sm rounded-lg font-label-lg text-xs sm:text-label-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[17px] sm:text-[19px] text-error">remove_circle_outline</span>
                <span>إضافة خصم</span>
              </button>
              <button
                type="button"
                onClick={() => setModal("reward")}
                className="inline-flex items-center justify-center gap-space-xs bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40 px-2 sm:px-space-md py-2 sm:py-space-sm rounded-lg font-label-lg text-xs sm:text-label-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[17px] sm:text-[19px] text-secondary">military_tech</span>
                <span>إضافة مكافأة</span>
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-space-xs bg-primary-container hover:bg-inverse-primary text-on-primary-container px-2 sm:px-space-lg py-2 sm:py-space-sm rounded-lg font-label-lg text-xs sm:text-label-lg shadow-sm transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]">add</span>
                <span>إضافة موظف</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl p-space-md shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute right-space-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/60 font-body-md text-body-md pr-10 pl-space-md py-space-sm rounded-lg focus:outline-none focus:bg-surface-container-low transition-colors"
                placeholder="بحث عن الموظف..."
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-space-sm w-full md:w-auto">
              <div className="flex items-center gap-space-xs text-on-surface-variant font-label-md text-label-md shrink-0">
                <span className="material-symbols-outlined text-[18px] text-secondary">storefront</span>
                <span>فلتر حسب الفرع:</span>
              </div>
              <select
                className="w-full md:w-56 bg-surface-container-lowest text-on-surface font-body-md text-body-md px-space-md py-space-sm rounded-lg focus:outline-none cursor-pointer"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <option value="all">جميع الفروع</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-surface-container rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-surface-container-high text-on-surface-variant font-label-lg text-label-md">
                    <th className="py-space-md px-space-lg">اسم الموظف</th>
                    <th className="py-space-md px-space-md">الوظيفة</th>
                    <th className="py-space-md px-space-md">الفرع</th>
                    <th className="py-space-md px-space-md">رقم الهاتف</th>
                    <th className="py-space-md px-space-md text-center">الحالة</th>
                    <th className="py-space-md px-space-lg text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {loading ? (
                    <tr><td colSpan="6" className="text-center py-4 text-on-surface-variant">جاري التحميل...</td></tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-4 text-on-surface-variant">لا يوجد موظفين</td></tr>
                  ) : filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="py-space-md px-space-lg">
                        <div className="flex items-center gap-space-sm">
                          <div className={"w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-label-lg text-label-md shrink-0"}>
                            {emp.full_name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-label-lg text-label-lg text-on-surface">{emp.full_name}</span>
                            <span className="font-body-sm text-xs text-on-surface-variant">{emp.code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface-variant">
                        {roleLabels[emp.job_role] || emp.job_role}
                      </td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface-variant">
                        {emp.branch_name || "الإدارة العامة / بدون فرع"}
                      </td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface-variant dir-ltr text-right">{emp.phone || '-'}</td>
                      <td className="py-space-md px-space-md text-center">
                        {emp.status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-label-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                            نشط
                          </span>
                        ) : emp.status === "suspended" ? (
                          <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-error-container/15 text-error font-label-sm text-label-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                            موقوف
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-secondary-container/15 text-secondary font-label-sm text-label-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                            {emp.status}
                          </span>
                        )}
                      </td>
                      <td className="py-space-md px-space-lg text-left">
                        <div className="inline-flex items-center gap-space-sm">
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryEmployee(emp);
                              setHistoryTab("leaves");
                              setAttendanceMonthOffset(0);
                              setModal("history");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary font-label-md text-label-md transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">badge</span>
                            <span>السجل / التفاصيل</span>
                          </button>
                          <span className="text-surface-container-highest">|</span>
                          <button 
                            type="button" 
                            onClick={() => {
                              setFormData({...emp});
                              setModal("edit");
                            }}
                            className="text-primary hover:text-primary-fixed transition-colors font-label-md text-label-md"
                          >
                            تعديل
                          </button>
                          <span className="text-surface-container-highest">|</span>
                          <button 
                            type="button" 
                            onClick={() => handleDelete(emp)}
                            className="text-error hover:text-on-error-container transition-colors font-label-md text-label-md"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* المودال 1: طلب إجازة */}
      {modal === "leave" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="w-full max-w-lg bg-surface-container rounded-xl shadow-xl border border-outline-variant/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-surface-container-high bg-surface-container-low">
              <div className="flex items-center gap-space-xs text-tertiary">
                <span className="material-symbols-outlined text-[22px]">event_note</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">طلب إجازة للموظف</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleLeaveSubmit} className="p-space-lg flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">اختيار الموظف</label>
                <select
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-tertiary focus:outline-none"
                  required
                  value={formData.employee_id || ''}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                >
                  <option value="">اختر الموظف...</option>
                  {employees.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.full_name} - {roleLabels[opt.job_role] || opt.job_role}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">تاريخ البداية</label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-tertiary focus:outline-none"
                    required type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">تاريخ النهاية</label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-tertiary focus:outline-none"
                    required type="date"
                    value={formData.end_date || ''}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">سبب الإجازة والمبررات</label>
                <textarea
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-tertiary focus:outline-none resize-none"
                  placeholder="أدخل تفاصيل سبب طلب الإجازة أو الملاحظات..."
                  rows={3}
                  required
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                ></textarea>
              </div>
              <div className="flex items-center justify-end gap-space-sm pt-space-xs mt-2 border-t border-surface-container-high">
                <button type="button" onClick={() => setModal(null)} className="px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-lg">إلغاء</button>
                <button type="submit" className="px-space-lg py-space-sm rounded-lg bg-tertiary-container hover:bg-tertiary text-on-tertiary-container font-semibold transition-colors font-label-lg">تأكيد الحفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* المودال 2: إضافة خصم / عجز */}
      {modal === "deduction" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="w-full max-w-lg bg-surface-container rounded-xl shadow-xl border border-outline-variant/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-surface-container-high bg-surface-container-low">
              <div className="flex items-center gap-space-xs text-error">
                <span className="material-symbols-outlined text-[22px]">remove_circle_outline</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">إضافة خصم / تسجيل عجز</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleDeductionSubmit} className="p-space-lg flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">اختيار الموظف</label>
                <select
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none"
                  required
                  value={formData.employee_id || ''}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                >
                  <option value="">اختر الموظف...</option>
                  {employees.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">السبب المباشر</label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none"
                    placeholder="مثال: عجز كاش" required type="text"
                    value={formData.reason || ''}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">قيمة الخصم ({CURRENCY})</label>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none"
                    placeholder="0.00" required step="0.5" type="number"
                    value={formData.cash_amount || ''}
                    onChange={(e) => setFormData({ ...formData, cash_amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">ملاحظات إضافية</label>
                <textarea
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none resize-none"
                  placeholder="أي تفاصيل أو توثيق إضافي لعملية الخصم..." rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                ></textarea>
              </div>
              <div className="flex items-center justify-end gap-space-sm pt-space-xs mt-2 border-t border-surface-container-high">
                <button type="button" onClick={() => setModal(null)} className="px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-lg">إلغاء</button>
                <button type="submit" className="px-space-lg py-space-sm rounded-lg bg-error hover:bg-error-container text-surface-container-lowest font-semibold transition-colors font-label-lg">تأكيد الحفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* المودال 3: إضافة مكافأة */}
      {modal === "reward" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="w-full max-w-lg bg-surface-container rounded-xl shadow-xl border border-outline-variant/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-surface-container-high bg-surface-container-low">
              <div className="flex items-center gap-space-xs text-secondary">
                <span className="material-symbols-outlined text-[22px]">military_tech</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">إضافة مكافأة لموظف</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleRewardSubmit} className="p-space-lg flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">اختيار الموظف</label>
                <select
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-secondary focus:outline-none"
                  required
                  value={formData.employee_id || ''}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                >
                  <option value="">اختر الموظف...</option>
                  {employees.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">قيمة المكافأة ({CURRENCY})</label>
                <input
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-secondary focus:outline-none"
                  placeholder="0.00" required step="10" type="number"
                  value={formData.cash_amount || ''}
                  onChange={(e) => setFormData({ ...formData, cash_amount: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">سبب المكافأة</label>
                <input
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-secondary focus:outline-none"
                  placeholder="مثال: تحقيق مستهدف مبيعات باقات الدايت / موظف الشهر" required type="text"
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">ملاحظات وتقدير الأداء</label>
                <textarea
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-secondary focus:outline-none resize-none"
                  placeholder="ملاحظات توثيقية إضافية للأداء المتميز..." rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                ></textarea>
              </div>
              <div className="flex items-center justify-end gap-space-sm pt-space-xs mt-2 border-t border-surface-container-high">
                <button type="button" onClick={() => setModal(null)} className="px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-lg">إلغاء</button>
                <button type="submit" className="px-space-lg py-space-sm rounded-lg bg-secondary-container hover:bg-secondary text-on-secondary-container font-semibold transition-colors font-label-lg">تأكيد الحفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* المودال 4: سجل وتفاصيل الموظف */}
      {modal === "history" && historyEmployee && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="w-full max-w-4xl bg-surface-container rounded-xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-surface-container-high bg-surface-container-low shrink-0">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-full bg-primary-container/20 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">account_box</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">{historyEmployee.full_name}</h3>
                    <span className="text-xs bg-tertiary-container/20 text-tertiary px-2 py-0.5 rounded-full font-label-sm">سجل العمليات</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{roleLabels[historyEmployee.job_role] || historyEmployee.job_role}</p>
                </div>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div className="flex items-center gap-2 px-space-lg pt-space-sm bg-surface-container-low/50 border-b border-surface-container-high shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setHistoryTab("leaves")}
                className={historyTab === "leaves"
                  ? "flex items-center gap-1.5 px-space-md py-2.5 font-label-lg text-label-lg border-b-2 border-primary text-primary transition-colors"
                  : "flex items-center gap-1.5 px-space-md py-2.5 font-label-lg text-label-lg border-b-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors"}
              >
                <span className="material-symbols-outlined text-[18px]">event_note</span>
                <span>طلبات الإجازات</span>
                <span className="mr-1 bg-surface-container-highest px-1.5 py-0.5 rounded-full text-xs text-on-surface-variant">{empLeaves.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab("deductions")}
                className={historyTab === "deductions"
                  ? "flex items-center gap-1.5 px-space-md py-2.5 font-label-lg text-label-lg border-b-2 border-primary text-primary transition-colors"
                  : "flex items-center gap-1.5 px-space-md py-2.5 font-label-lg text-label-lg border-b-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors"}
              >
                <span className="material-symbols-outlined text-[18px]">remove_circle_outline</span>
                <span>الخصومات والعجز</span>
                <span className="mr-1 bg-surface-container-highest px-1.5 py-0.5 rounded-full text-xs text-on-surface-variant">{empDeductions.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setHistoryTab("rewards")}
                className={historyTab === "rewards"
                  ? "flex items-center gap-1.5 px-space-md py-2.5 font-label-lg text-label-lg border-b-2 border-primary text-primary transition-colors"
                  : "flex items-center gap-1.5 px-space-md py-2.5 font-label-lg text-label-lg border-b-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors"}
              >
                <span className="material-symbols-outlined text-[18px]">military_tech</span>
                <span>المكافآت</span>
                <span className="mr-1 bg-surface-container-highest px-1.5 py-0.5 rounded-full text-xs text-on-surface-variant">{empRewards.length}</span>
              </button>
              <button 
                type="button"
                onClick={() => setHistoryTab("attendance")}
                className={historyTab === "attendance" 
                  ? "flex items-center gap-1.5 px-space-md py-2.5 font-label-lg text-label-lg border-b-2 border-primary text-primary transition-colors whitespace-nowrap" 
                  : "flex items-center gap-1.5 px-space-md py-2.5 font-label-lg text-label-lg border-b-2 border-transparent text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap"}
              >
                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                <span>الحضور والغياب</span>
              </button>
            </div>

            <div className="p-space-lg overflow-y-auto flex-1">

              {historyTab === "attendance" && (
                <div className="block">
                  <div className="flex items-center justify-between mb-4 bg-surface-container-low p-2 rounded-lg">
                    <button 
                      type="button" 
                      onClick={() => setAttendanceMonthOffset(prev => prev + 1)}
                      disabled={attendanceMonthOffset >= 2}
                      className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-lg disabled:opacity-50 text-sm font-bold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      الشهر السابق
                    </button>
                    <div className="font-bold text-primary">
                      {attendanceMonthOffset === 0 ? "الشهر الحالي" : attendanceMonthOffset === 1 ? "الشهر الماضي" : "قبل شهرين"}
                      {' '}
                      {(() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - attendanceMonthOffset);
                        return `(${d.toLocaleString('ar-EG', {month: 'long', year: 'numeric'})})`;
                      })()}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setAttendanceMonthOffset(prev => prev - 1)}
                      disabled={attendanceMonthOffset <= 0}
                      className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-lg disabled:opacity-50 text-sm font-bold flex items-center gap-1"
                    >
                      التالي
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                  </div>
                  
                  <div className="rounded-lg border border-outline-variant/30 overflow-hidden bg-surface-container-lowest">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-surface-container-high text-on-surface-variant font-label-md text-label-sm border-b border-surface-container-highest">
                          <th className="py-2.5 px-4">تاريخ السجل</th>
                          <th className="py-2.5 px-4 text-center">الحالة</th>
                          <th className="py-2.5 px-4">تم التسجيل من</th>
                          <th className="py-2.5 px-4">الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high text-body-sm">
                        {attendance.length === 0 ? (
                          <tr><td colSpan="4" className="text-center py-4 text-on-surface-variant">لا توجد سجلات لهذا الشهر</td></tr>
                        ) : attendance.map((att, index) => (
                          <tr key={index}>
                            <td className="py-3 px-4 font-semibold text-on-surface">{new Date(att.date).toLocaleDateString('ar-EG', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'})}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={att.status === "present" ? "px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-xs" : att.status === "absent" ? "px-2 py-0.5 rounded-full bg-error-container/15 text-error font-label-sm text-xs" : "px-2 py-0.5 rounded-full bg-secondary-container/15 text-secondary font-label-sm text-xs"}>
                                {att.status === 'present' ? 'حاضر' : att.status === 'absent' ? 'غائب' : 'إجازة'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-on-surface-variant text-xs">{att.recorded_from === 'cashier' ? 'الكاشير' : att.recorded_from === 'inventory' ? 'المخزن' : 'الموارد البشرية'}</td>
                            <td className="py-3 px-4 text-on-surface-variant">{att.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {historyTab === "leaves" && (
                <div className="block">
                  <div className="rounded-lg border border-outline-variant/30 overflow-hidden bg-surface-container-lowest">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-surface-container-high text-on-surface-variant font-label-md text-label-sm border-b border-surface-container-highest">
                          <th className="py-2.5 px-4">تاريخ الطلب</th>
                          <th className="py-2.5 px-4">المدة من - إلى</th>
                          <th className="py-2.5 px-4">السبب</th>
                          <th className="py-2.5 px-4 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high text-body-sm">
                        {empLeaves.length === 0 ? (
                          <tr><td colSpan="4" className="text-center py-4 text-on-surface-variant">لا توجد إجازات</td></tr>
                        ) : empLeaves.map((leave, index) => (
                          <tr key={index}>
                            <td className="py-3 px-4 font-semibold text-on-surface">{new Date(leave.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-on-surface-variant dir-ltr text-right">{leave.start_date} - {leave.end_date}</td>
                            <td className="py-3 px-4 text-on-surface-variant">{leave.reason}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={leave.status === "approved" ? "px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-xs" : leave.status === "pending" ? "px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-xs" : "px-2 py-0.5 rounded-full bg-error-container/15 text-error font-label-sm text-xs"}>
                                {leave.status === 'approved' ? 'موافق عليه' : leave.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {historyTab === "deductions" && (
                <div className="block">
                  <div className="rounded-lg border border-outline-variant/30 overflow-hidden bg-surface-container-lowest">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-surface-container-high text-on-surface-variant font-label-md text-label-sm border-b border-surface-container-highest">
                          <th className="py-2.5 px-4">النوع</th>
                          <th className="py-2.5 px-4">القيمة</th>
                          <th className="py-2.5 px-4">التاريخ</th>
                          <th className="py-2.5 px-4">الملاحظات</th>
                          <th className="py-2.5 px-4 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high text-body-sm">
                        {empDeductions.length === 0 ? (
                          <tr><td colSpan="5" className="text-center py-4 text-on-surface-variant">لا توجد خصومات</td></tr>
                        ) : empDeductions.map((d, index) => (
                          <tr key={index}>
                            <td className="py-3 px-4 font-semibold text-error">خصم ({d.amount_type})</td>
                            <td className="py-3 px-4 text-error font-bold font-mono">{d.cash_amount || d.days_amount} {d.amount_type === 'cash' ? CURRENCY : 'أيام'}</td>
                            <td className="py-3 px-4 text-on-surface-variant">{new Date(d.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-on-surface-variant text-xs">{d.notes}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={d.status === "approved" ? "px-2 py-0.5 rounded-full bg-error-container/15 text-error font-label-sm text-xs" : d.status === "pending" ? "px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-xs" : "px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-xs"}>
                                {d.status === 'approved' ? 'موافق عليه' : d.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {historyTab === "rewards" && (
                <div className="block">
                  <div className="rounded-lg border border-outline-variant/30 overflow-hidden bg-surface-container-lowest">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-surface-container-high text-on-surface-variant font-label-md text-label-sm border-b border-surface-container-highest">
                          <th className="py-2.5 px-4">القيمة</th>
                          <th className="py-2.5 px-4">التاريخ</th>
                          <th className="py-2.5 px-4">الملاحظات</th>
                          <th className="py-2.5 px-4 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high text-body-sm">
                        {empRewards.length === 0 ? (
                          <tr><td colSpan="4" className="text-center py-4 text-on-surface-variant">لا توجد مكافآت</td></tr>
                        ) : empRewards.map((r, index) => (
                          <tr key={index}>
                            <td className="py-3 px-4 font-bold text-tertiary font-mono">+ {r.cash_amount || r.days_amount} {r.amount_type === 'cash' ? CURRENCY : 'أيام'}</td>
                            <td className="py-3 px-4 text-on-surface-variant">{new Date(r.created_at).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-on-surface-variant text-xs">{r.notes}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={r.status === "approved" ? "px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-xs" : r.status === "pending" ? "px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-xs" : "px-2 py-0.5 rounded-full bg-error-container/15 text-error font-label-sm text-xs"}>
                                {r.status === 'approved' ? 'موافق عليه' : r.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
            <div className="px-space-lg py-space-sm bg-surface-container-low border-t border-surface-container-high flex justify-between items-center shrink-0">
              <span className="text-xs text-on-surface-variant">سلسلة مطاعم دايت كينج - الموارد البشرية والرواتب</span>
              <button type="button" onClick={() => setModal(null)} className="px-space-lg py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-colors">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* المودال 5: تعديل الموظف */}
      {modal === "edit" && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/70 backdrop-blur-sm p-4 overflow-y-auto py-8"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div className="w-full max-w-2xl bg-surface-container rounded-xl shadow-xl border border-outline-variant/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-surface-container-high bg-surface-container-low">
              <div className="flex items-center gap-space-xs text-primary">
                <span className="material-symbols-outlined text-[22px]">edit</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">تعديل بيانات الموظف</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-space-lg flex flex-col gap-space-md max-h-[75vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">الاسم الكامل *</label>
                  <input type="text" required value={formData.full_name || ''} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">رقم الهاتف</label>
                  <input type="text" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">الوظيفة *</label>
                  <select required value={formData.job_role || ''} onChange={(e) => setFormData({...formData, job_role: e.target.value})} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">اختر...</option>
                    {Object.entries(roleLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">الفرع</label>
                  <select value={formData.branch_id || ''} onChange={(e) => setFormData({...formData, branch_id: e.target.value})} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">(بدون فرع)</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">الراتب الأساسي</label>
                  <input type="number" step="0.01" value={formData.basic_salary || 0} onChange={(e) => setFormData({...formData, basic_salary: e.target.value})} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">البدلات</label>
                  <input type="number" step="0.01" value={formData.allowances || 0} onChange={(e) => setFormData({...formData, allowances: e.target.value})} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-on-surface-variant">بدل النقل</label>
                  <input type="number" step="0.01" value={formData.transport_allowance || 0} onChange={(e) => setFormData({...formData, transport_allowance: e.target.value})} className="w-full bg-surface-container-lowest text-on-surface py-2 px-3 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-space-sm pt-space-md mt-2 border-t border-surface-container-high sticky bottom-0 bg-surface-container py-2">
                <button type="button" onClick={() => setModal(null)} className="px-space-md py-space-sm rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors font-label-lg">إلغاء</button>
                <button type="submit" className="px-space-lg py-space-sm rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold transition-colors font-label-lg">تأكيد التعديل</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
