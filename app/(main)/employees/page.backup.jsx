"use client";

import { useState } from "react";
import { CURRENCY } from "../../../lib/config";

const EMPLOYEES = [
  { id: 1, name: "خالد عبد الرحمن الغامدي", role: "مدير فرع", branch: "فرع التحلية - الرياض", branchKey: "tahlia", phone: "0501122334", status: "working", avatar: "خ", tone: "primary", historyRole: "مدير فرع - فرع التحلية" },
  { id: 2, name: "عمر بن سعد الدوسري", role: "شيف وجبات دايت", branch: "فرع العليا - الرياض", branchKey: "olaya", phone: "0552233445", status: "working", avatar: "ع", tone: "secondary", historyRole: "شيف وجبات دايت - فرع العليا" },
  { id: 3, name: "ريان محمد القحطاني", role: "كاشير / مسؤول POS", branch: "فرع التحلية - الرياض", branchKey: "tahlia", phone: "0563344556", status: "working", avatar: "ر", tone: "primary", historyRole: "كاشير / مسؤول POS - فرع التحلية" },
  { id: 4, name: "فهد عبد الله المطيري", role: "أخصائي تغذية وحميات", branch: "الإدارة العامة", branchKey: "hq", phone: "0544455667", status: "working", avatar: "ف", tone: "secondary", historyRole: "أخصائي تغذية وحميات - الإدارة العامة" },
  { id: 5, name: "طارق إبراهيم النجار", role: "منسق مستودع الأغذية", branch: "المستودع المركزي", branchKey: "warehouse", phone: "0595566778", status: "leave", avatar: "ط", tone: "secondary", historyRole: "منسق مستودع الأغذية - المستودع المركزي" },
  { id: 6, name: "حسام منير الشيخ", role: "مسؤول توصيل وطلبات", branch: "فرع طريق الملك - جدة", branchKey: "king-road", phone: "0536677889", status: "working", avatar: "ح", tone: "primary", historyRole: "مسؤول توصيل وطلبات - فرع طريق الملك" },
];

const EMPLOYEE_OPTIONS = [
  { value: "1", label: "خالد عبد الرحمن الغامدي - مدير فرع (التحلية)" },
  { value: "2", label: "عمر بن سعد الدوسري - شيف وجبات دايت (العليا)" },
  { value: "3", label: "ريان محمد القحطاني - كاشير (التحلية)" },
  { value: "4", label: "فهد عبد الله المطيري - أخصائي تغذية (الإدارة العامة)" },
  { value: "5", label: "طارق إبراهيم النجار - منسق مستودع (المستودع المركزي)" },
  { value: "6", label: "حسام منير الشيخ - مسؤول توصيل (جدة)" },
];

const LEAVES = [
  { type: "إجازة سنوية", range: "2025/04/10 - 2025/04/24", days: "14 يوم", reason: "إجازة سنوية مجدولة للفترة الصيفية", label: "معتمدة", tone: "ok" },
  { type: "إجازة مرضية", range: "2025/02/12 - 2025/02/14", days: "3 أيام", reason: "وعكة صحية (مرفق تقرير مستشفى رعاية)", label: "معتمدة وموثقة", tone: "ok" },
  { type: "إجازة طارئة", range: "2024/11/05 - 2024/11/06", days: "يوم واحد", reason: "ظرف عائلي طارئ", label: "مكتملة", tone: "done" },
];

const DEDUCTIONS = [
  { type: "عجز كاش", amount: "85.00", reason: "فارق مطابقة صندوق نقطة البيع رقم 2", date: "2025/03/01", note: "تمت التسوية بخصم من الراتب الشهري", tone: "error" },
  { type: "خصم تأخير", amount: "50.00", reason: "تأخر غير مبرر عن فتح فرع التحلية (45 دقيقة)", date: "2025/01/18", note: "إنذار أولي مع الخصم الجزئي", tone: "secondary" },
];

const REWARDS = [
  { amount: "500.00", reason: "تحقيق أعلى مبيعات لباقات الاشتراك الصحي", date: "2025/03/15", note: "تجاوز المستهدف الربعي بنسبة 118% لفرع التحلية" },
  { amount: "350.00", reason: "موظف الشهر المثالي (فبراير 2025)", date: "2025/02/28", note: "تقييم 98% في رضا العملاء والالتزام بمعايير الهيئة" },
  { amount: "200.00", reason: "تغطية ورديات إضافية خلال العيد الوطني", date: "2024/09/24", note: "شكر وتقدير من الإدارة التشغيلية للجاهزية العالية" },
];

export default function EmployeesPage() {
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [modal, setModal] = useState(null); // null | "leave" | "deduction" | "reward" | "history"
  const [historyEmployee, setHistoryEmployee] = useState({ name: "", role: "" });
  const [historyTab, setHistoryTab] = useState("leaves"); // "leaves" | "deductions" | "rewards"

  const filteredEmployees = EMPLOYEES.filter((emp) => {
    const matchBranch = branchFilter === "all" || emp.branchKey === branchFilter;
    const matchQuery = emp.name.toLowerCase().includes(query.trim().toLowerCase());
    return matchBranch && matchQuery;
  });

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
                <option value="tahlia">فرع التحلية</option>
                <option value="olaya">فرع العليا</option>
                <option value="king-road">فرع طريق الملك</option>
                <option value="khobar">فرع الخبر</option>
                <option value="shatea">فرع الشاطئ</option>
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
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="py-space-md px-space-lg">
                        <div className="flex items-center gap-space-sm">
                          <div className={emp.tone === "primary" ? "w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-label-lg text-label-md shrink-0" : "w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-secondary font-label-lg text-label-md shrink-0"}>
                            {emp.avatar}
                          </div>
                          <span className="font-label-lg text-label-lg text-on-surface">{emp.name}</span>
                        </div>
                      </td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface-variant">{emp.role}</td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface-variant">{emp.branch}</td>
                      <td className="py-space-md px-space-md font-body-md text-body-md text-on-surface-variant dir-ltr text-right">{emp.phone}</td>
                      <td className="py-space-md px-space-md text-center">
                        {emp.status === "working" ? (
                          <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-label-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                            على رأس العمل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-secondary-container/15 text-secondary font-label-sm text-label-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                            إجازة
                          </span>
                        )}
                      </td>
                      <td className="py-space-md px-space-lg text-left">
                        <div className="inline-flex items-center gap-space-sm">
                          <button 
                            type="button"
                            onClick={() => {
                              setHistoryEmployee({ name: emp.name, role: emp.historyRole });
                              setHistoryTab("leaves");
                              setModal("history");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary font-label-md text-label-md transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">badge</span>
                            <span>السجل / التفاصيل</span>
                          </button>
                          <span className="text-surface-container-highest">|</span>
                          <button type="button" className="text-primary hover:text-primary-fixed transition-colors font-label-md text-label-md">تعديل</button>
                          <span className="text-surface-container-highest">|</span>
                          <button type="button" className="text-error hover:text-on-error-container transition-colors font-label-md text-label-md">حذف</button>
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
            <form onSubmit={(e) => { e.preventDefault(); setModal(null); }} className="p-space-lg flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">اختيار الموظف</label>
                <select className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-tertiary focus:outline-none" required>
                  <option value="">اختر الموظف...</option>
                  {EMPLOYEE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">نوع الإجازة</label>
                <select className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-tertiary focus:outline-none" required>
                  <option value="annual">إجازة سنوية اعتيادية</option>
                  <option value="sick">إجازة مرضية (بتقرير طبي)</option>
                  <option value="emergency">إجازة طارئة / عارضة</option>
                  <option value="unpaid">إجازة غير مدفوعة الأجر</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">تاريخ البداية</label>
                  <input className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-tertiary focus:outline-none" required type="date"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">تاريخ النهاية</label>
                  <input className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-tertiary focus:outline-none" required type="date"/>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">سبب الإجازة والمبررات</label>
                <textarea className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-tertiary focus:outline-none resize-none" placeholder="أدخل تفاصيل سبب طلب الإجازة أو الملاحظات..." rows={3}></textarea>
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
            <form onSubmit={(e) => { e.preventDefault(); setModal(null); }} className="p-space-lg flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">اختيار الموظف</label>
                <select className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none" required>
                  <option value="">اختر الموظف...</option>
                  {EMPLOYEE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">نوع الخصم / العجز</label>
                  <select className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none" required>
                    <option value="cash_shortage">عجز كاش نقاط البيع</option>
                    <option value="custody_shortage">عجز عهدة مواد خام / مخزون</option>
                    <option value="delay">خصم تأخير عن الوردية</option>
                    <option value="violation">خصم مخالفة معايير الجودة والزي</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">قيمة الخصم ({CURRENCY})</label>
                  <input className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none" placeholder="0.00" required step="0.5" type="number"/>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">السبب المباشر</label>
                  <input className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none" placeholder="مثال: عجز في إغلاق وردية المساء" required type="text"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">التاريخ</label>
                  <input className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none" required type="date"/>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">ملاحظات إضافية</label>
                <textarea className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-error focus:outline-none resize-none" placeholder="أي تفاصيل أو توثيق إضافي لعملية الخصم..." rows={2}></textarea>
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
            <form onSubmit={(e) => { e.preventDefault(); setModal(null); }} className="p-space-lg flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">اختيار الموظف</label>
                <select className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-secondary focus:outline-none" required>
                  <option value="">اختر الموظف...</option>
                  {EMPLOYEE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">قيمة المكافأة ({CURRENCY})</label>
                  <input className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-secondary focus:outline-none" placeholder="0.00" required step="10" type="number"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-label-md text-on-surface-variant">التاريخ</label>
                  <input className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-secondary focus:outline-none" required type="date"/>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">سبب المكافأة</label>
                <input className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-secondary focus:outline-none" placeholder="مثال: تحقيق مستهدف مبيعات باقات الدايت / موظف الشهر" required type="text"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant">ملاحظات وتقدير الأداء</label>
                <textarea className="w-full bg-surface-container-lowest text-on-surface font-body-md py-space-sm px-space-md rounded-lg border border-outline-variant/40 focus:border-secondary focus:outline-none resize-none" placeholder="ملاحظات توثيقية إضافية للأداء المتميز..." rows={2}></textarea>
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
      {modal === "history" && (
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
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">{historyEmployee.name}</h3>
                    <span className="text-xs bg-tertiary-container/20 text-tertiary px-2 py-0.5 rounded-full font-label-sm">سجل العمليات</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{historyEmployee.role}</p>
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
                <span className="mr-1 bg-surface-container-highest px-1.5 py-0.5 rounded-full text-xs text-on-surface-variant">{LEAVES.length}</span>
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
                <span className="mr-1 bg-surface-container-highest px-1.5 py-0.5 rounded-full text-xs text-on-surface-variant">{DEDUCTIONS.length}</span>
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
                <span className="mr-1 bg-surface-container-highest px-1.5 py-0.5 rounded-full text-xs text-on-surface-variant">{REWARDS.length}</span>
              </button>
            </div>
            
            <div className="p-space-lg overflow-y-auto flex-1">
              
              {historyTab === "leaves" && (
                <div className="block">
                  <div className="rounded-lg border border-outline-variant/30 overflow-hidden bg-surface-container-lowest">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-surface-container-high text-on-surface-variant font-label-md text-label-sm border-b border-surface-container-highest">
                          <th className="py-2.5 px-4">نوع الإجازة</th>
                          <th className="py-2.5 px-4">المدة من - إلى</th>
                          <th className="py-2.5 px-4">عدد الأيام</th>
                          <th className="py-2.5 px-4">السبب</th>
                          <th className="py-2.5 px-4 text-center">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high text-body-sm">
                        {LEAVES.map((leave, index) => (
                          <tr key={index}>
                            <td className="py-3 px-4 font-semibold text-on-surface">{leave.type}</td>
                            <td className="py-3 px-4 text-on-surface-variant dir-ltr text-right">{leave.range}</td>
                            <td className="py-3 px-4 text-on-surface">{leave.days}</td>
                            <td className="py-3 px-4 text-on-surface-variant">{leave.reason}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={leave.tone === "ok" ? "px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary font-label-sm text-xs" : "px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-xs"}>
                                {leave.label}
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
                          <th className="py-2.5 px-4">السبب</th>
                          <th className="py-2.5 px-4">التاريخ</th>
                          <th className="py-2.5 px-4">الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high text-body-sm">
                        {DEDUCTIONS.map((d, index) => (
                          <tr key={index}>
                            <td className={d.tone === "error" ? "py-3 px-4 font-semibold text-error" : "py-3 px-4 font-semibold text-secondary"}>{d.type}</td>
                            <td className={d.tone === "error" ? "py-3 px-4 text-error font-bold font-mono" : "py-3 px-4 text-secondary font-bold font-mono"}>{d.amount} {CURRENCY}</td>
                            <td className="py-3 px-4 text-on-surface">{d.reason}</td>
                            <td className="py-3 px-4 text-on-surface-variant">{d.date}</td>
                            <td className="py-3 px-4 text-on-surface-variant text-xs">{d.note}</td>
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
                          <th className="py-2.5 px-4">قيمة المكافأة</th>
                          <th className="py-2.5 px-4">سبب الاستحقاق</th>
                          <th className="py-2.5 px-4">التاريخ</th>
                          <th className="py-2.5 px-4">الملاحظات والتقييم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-high text-body-sm">
                        {REWARDS.map((r, index) => (
                          <tr key={index}>
                            <td className="py-3 px-4 font-bold text-tertiary font-mono">+ {r.amount} {CURRENCY}</td>
                            <td className="py-3 px-4 font-semibold text-on-surface">{r.reason}</td>
                            <td className="py-3 px-4 text-on-surface-variant">{r.date}</td>
                            <td className="py-3 px-4 text-on-surface-variant text-xs">{r.note}</td>
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

    </>
  );
}
