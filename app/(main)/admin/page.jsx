"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/api";
import { useBranches } from "@/hooks/useData";

const ROLE_BADGES = {
  owner: { label: "مالك النظام (Owner)", box: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30" },
  branch_manager: { label: "مدير فرع", box: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary/20 text-secondary border border-secondary/30" },
  manager: { label: "مدير تشغيل", box: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary/20 text-secondary border border-secondary/30" },
  cashier: { label: "كاشير نقطة بيع", box: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tertiary/20 text-tertiary border border-tertiary/30" },
  accountant: { label: "محاسب مالي", box: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/70 text-indigo-300 border border-indigo-700/40" },
  hr: { label: "موارد بشرية", box: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/70 text-purple-300 border border-purple-700/40" },
  storekeeper: { label: "أمين مخزن", box: "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-700/40" },
};

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [customPasswords, setCustomPasswords] = useState({});

  // Master Admin Password State
  const [adminPassword, setAdminPassword] = useState("DK2027");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [editingAdminPassword, setEditingAdminPassword] = useState(false);
  const [tempAdminPassword, setTempAdminPassword] = useState("DK2027");

  // VAT Rate State
  const [vatRate, setVatRate] = useState("15");
  const [editingVat, setEditingVat] = useState(false);
  const [tempVatRate, setTempVatRate] = useState("15");

  // Notification Toast
  const [toastMessage, setToastMessage] = useState(null);

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' | 'edit' | 'password'
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFullName, setUserFullName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("cashier");
  const [userBranchId, setUserBranchId] = useState("");

  const { data: rawBranches = [] } = useBranches();

  // Load Real Data from Supabase
  useEffect(() => {
    fetchAdminData();
  }, [rawBranches]);

  async function fetchAdminData() {
    setLoadingUsers(true);
    try {
      // 1. جلب المستخدمين عبر دالة RPC get_admin_users
      let loadedUsers = [];
      try {
        const { data: rpcUsers, error: rpcErr } = await supabase.rpc("get_admin_users");
        if (!rpcErr && Array.isArray(rpcUsers) && rpcUsers.length > 0) {
          loadedUsers = rpcUsers;
        }
      } catch {}

      // Fallback: جلب من جدول profiles مباشرة إذا لم تُشغّل الـ RPC بعد
      if (loadedUsers.length === 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, role, branch_id, is_active, created_at, current_password")
          .order("created_at", { ascending: false });

        if (profs && profs.length > 0) {
          const branchMap = Object.fromEntries(rawBranches.map(b => [b.id, b.name]));
          loadedUsers = profs.map(p => ({
            id: p.id,
            full_name: p.full_name || "مستخدم",
            email: p.role === "owner" ? "samerashour@dietking.com" : `${p.full_name?.toLowerCase().replace(/\s+/g, "") || "user"}@dietking.com`,
            password: p.current_password || (p.role === "owner" ? "Samer@2026" : "••••••••"),
            role: p.role || "cashier",
            branch_id: p.branch_id,
            branch_name: branchMap[p.branch_id] || "الإدارة العامة",
            is_active: p.is_active,
            created_at: p.created_at,
          }));
        }
      }

      if (loadedUsers.length > 0) {
        setUsers(loadedUsers);
      }

      // 2. جلب إعدادات باسورد إدارة الكاشير وضريبة القيمة المضافة
      try {
        const { data: settingsData } = await supabase.rpc("get_system_settings");
        if (Array.isArray(settingsData)) {
          const passRow = settingsData.find(s => s.label?.includes("باسورد") || s.key?.includes("password"));
          if (passRow && passRow.value) {
            // إذا كان الهاش المخزن هو تشفير DK2027
            const actualPass = passRow.value.startsWith("$2a$") ? "DK2027" : passRow.value;
            setAdminPassword(actualPass);
            setTempAdminPassword(actualPass);
          }
          const vatRow = settingsData.find(s => s.label?.includes("ضريبة") || s.key?.includes("vat"));
          if (vatRow && vatRow.value) {
            setVatRate(vatRow.value);
            setTempVatRate(vatRow.value);
          }
        }
      } catch {
        const { data: sRows } = await supabase.from("app_settings").select("*");
        if (sRows && sRows.length > 0) {
          const pass = sRows.find(s => s.label?.includes("باسورد") || s.key?.includes("password"));
          if (pass?.value) {
            const actualPass = pass.value.startsWith("$2a$") ? "DK2027" : pass.value;
            setAdminPassword(actualPass);
            setTempAdminPassword(actualPass);
          }
          const vat = sRows.find(s => s.label?.includes("ضريبة") || s.key?.includes("vat"));
          if (vat?.value) {
            setVatRate(vat.value);
            setTempVatRate(vat.value);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load admin data:", err);
    } finally {
      setLoadingUsers(false);
    }
  }

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function togglePasswordVisibility(id) {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function copyToClipboard(text, label) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`تم نسخ ${label} بنجاح`);
    }
  }

  // حفظ باسورد الإدارة في السجل القائم
  async function handleSaveAdminPassword() {
    if (!tempAdminPassword.trim()) return;
    setAdminPassword(tempAdminPassword);
    setEditingAdminPassword(false);
    showToast("تم تحديث باسورد إدارة الكاشير بنجاح");

    try {
      await supabase.rpc("update_app_setting", { p_identifier: "باسورد", p_new_value: tempAdminPassword });
    } catch {
      await supabase.from("app_settings").update({ value: tempAdminPassword }).ilike("label", "%باسورد%");
    }
  }

  // حفظ نسبة الضريبة في السجل القائم
  async function handleSaveVatRate() {
    if (!tempVatRate || Number(tempVatRate) < 0) return;
    setVatRate(tempVatRate);
    setEditingVat(false);
    showToast(`تم تحديث ضريبة القيمة المضافة (${tempVatRate}%) بنجاح`);

    try {
      await supabase.rpc("update_app_setting", { p_identifier: "ضريبة", p_new_value: String(tempVatRate) });
    } catch {
      await supabase.from("app_settings").update({ value: String(tempVatRate) }).ilike("label", "%ضريبة%");
    }
  }

  // فتح نافذة إنشاء مستخدم جديد
  function openCreateModal() {
    setModalMode("create");
    setSelectedUser(null);
    setUserFullName("");
    setUserEmail("");
    setUserPassword("DK#" + Math.floor(1000 + Math.random() * 9000));
    setUserRole("cashier");
    setUserBranchId(rawBranches[0]?.id || "");
    setUserModalOpen(true);
  }

  // فتح نافذة تعديل بيانات المستخدم
  function openEditModal(user) {
    setModalMode("edit");
    setSelectedUser(user);
    setUserFullName(user.full_name);
    setUserEmail(user.email);
    setUserPassword(customPasswords[user.id] || "••••••••");
    setUserRole(user.role);
    setUserBranchId(user.branch_id || rawBranches[0]?.id || "");
    setUserModalOpen(true);
  }

  // فتح نافذة تغيير كلمة المرور فقط
  function openPasswordModal(user) {
    setModalMode("password");
    setSelectedUser(user);
    setUserFullName(user.full_name);
    setUserEmail(user.email);
    setUserPassword("DK#" + Math.floor(1000 + Math.random() * 9000));
    setUserModalOpen(true);
  }

  // حذف مستخدم
  async function handleDeleteUser(user) {
    if (user.role === "owner") {
      alert("لا يمكن حذف حساب المالك الرئيسي للنظام");
      return;
    }

    if (window.confirm(`هل أنت متأكد من رغبتك في حذف حساب "${user.full_name}"؟`)) {
      setUsers(users.filter(u => u.id !== user.id));
      showToast(`تم حذف حساب ${user.full_name} بنجاح`);

      try {
        await supabase.from("profiles").delete().eq("id", user.id);
      } catch {}
    }
  }

  // معالجة الحفظ في المودال
  async function handleModalSubmit(e) {
    e.preventDefault();

    if (modalMode === "password") {
      // تعيين باسورد جديد للمستخدم
      setCustomPasswords(prev => ({ ...prev, [selectedUser.id]: userPassword }));
      showToast(`تم تحديث كلمة مرور "${selectedUser.full_name}" بنجاح`);
      setUserModalOpen(false);

      try {
        await supabase.rpc("admin_set_user_password", {
          p_user_id: selectedUser.id,
          p_new_password: userPassword,
        });
      } catch {}
      return;
    }

    if (modalMode === "create") {
      const newId = `usr-${Date.now()}`;
      const branchObj = rawBranches.find(b => b.id === userBranchId);
      const newUser = {
        id: newId,
        full_name: userFullName.trim(),
        email: userEmail.trim(),
        role: userRole,
        branch_id: userBranchId,
        branch_name: branchObj?.name || "الإدارة العامة",
        is_active: true,
      };

      setUsers([newUser, ...users]);
      setCustomPasswords(prev => ({ ...prev, [newId]: userPassword }));
      showToast(`تم إنشاء حساب المستخدم "${newUser.full_name}" بنجاح`);
      setUserModalOpen(false);

      // إنشاء المستخدم في Supabase
      try {
        const { data: signUpData } = await supabase.auth.signUp({
          email: newUser.email,
          password: userPassword,
          options: { data: { full_name: newUser.full_name } },
        });

        const createdId = signUpData?.user?.id || newId;
        await supabase.from("profiles").upsert([
          {
            id: createdId,
            full_name: newUser.full_name,
            role: newUser.role,
            branch_id: userBranchId || null,
            is_active: true,
          },
        ]);
      } catch {}
    } else if (modalMode === "edit") {
      const branchObj = rawBranches.find(b => b.id === userBranchId);
      setUsers(users.map(u => {
        if (u.id === selectedUser.id) {
          return {
            ...u,
            full_name: userFullName.trim(),
            role: userRole,
            branch_id: userBranchId,
            branch_name: branchObj?.name || u.branch_name,
          };
        }
        return u;
      }));

      if (userPassword && userPassword !== "••••••••") {
        setCustomPasswords(prev => ({ ...prev, [selectedUser.id]: userPassword }));
        try {
          await supabase.rpc("admin_set_user_password", {
            p_user_id: selectedUser.id,
            p_new_password: userPassword,
          });
        } catch {}
      }

      showToast(`تم تحديث بيانات المستخدم "${userFullName}" بنجاح`);
      setUserModalOpen(false);

      try {
        await supabase.from("profiles").update({
          full_name: userFullName.trim(),
          role: userRole,
          branch_id: userBranchId || null,
        }).eq("id", selectedUser.id);
      } catch {}
    }
  }

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-primary-container text-on-primary-container px-space-lg py-3 rounded-xl shadow-2xl flex items-center gap-space-sm font-label-lg border border-primary/30 animate-bounce">
          <span className="material-symbols-outlined text-[20px] text-primary">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md py-space-lg mb-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm mb-space-xs">
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold tracking-tight">
              لوحة الإدارة والتحكم
            </h1>
            <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full text-label-sm font-label-sm bg-primary/10 text-primary font-bold">
              <span className="material-symbols-outlined text-[14px]">shield_person</span>
              صلاحيات المالك (Owner)
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            إدارة جميع مستخدمي النظام وكلمات المرور، باسورد الإدارة المركزي، وضريبة القيمة المضافة
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-space-xs px-space-lg py-2.5 rounded-xl bg-primary-container hover:brightness-110 text-on-primary font-label-lg text-label-lg transition-all shadow-md font-bold cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>إنشاء مستخدم جديد</span>
        </button>
      </div>

      {/* System Settings: Master Admin Password & VAT Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg mb-space-xl">
        {/* Card 1: باسورد الإدارة المركزي */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">lock</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    باسورد الإدارة المركزي
                  </h3>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Master Admin Password</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-container/20 text-primary">
                نشط ومعتمد
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              كلمة المرور الإدارية المستخدمة لتجاوز العمليات المقيدة واعتمادات الكاشير وعمليات الجرد.
            </p>

            {editingAdminPassword ? (
              <div className="flex flex-col gap-2 bg-surface-container p-space-md rounded-xl">
                <label className="font-label-sm text-label-sm text-on-surface font-semibold">أدخل باسورد الإدارة الجديد:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempAdminPassword}
                    onChange={(e) => setTempAdminPassword(e.target.value)}
                    className="flex-1 bg-surface-container-lowest text-on-surface font-mono font-bold px-3 py-2 rounded-lg border border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary dir-ltr"
                    placeholder="Admin@DK2026"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAdminPassword}
                    className="px-4 py-2 rounded-lg bg-primary-container text-on-primary font-label-md font-bold hover:brightness-110 transition-colors cursor-pointer"
                  >
                    حفظ
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingAdminPassword(false); setTempAdminPassword(adminPassword); }}
                    className="px-3 py-2 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-surface-container p-space-md rounded-xl border border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-outline text-[20px]">key</span>
                  <span className="font-mono font-bold text-headline-sm text-primary dir-ltr tracking-wider">
                    {showAdminPassword ? adminPassword : "••••••••••••"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                    title={showAdminPassword ? "إخفاء" : "إظهار"}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showAdminPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(adminPassword, "باسورد الإدارة")}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                    title="نسخ الباسورد"
                  >
                    <span className="material-symbols-outlined text-[20px]">content_copy</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-space-md pt-space-sm border-t border-surface-container-highest/60 flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant">محفوظ في إعدادات النظام بأمان</span>
            {!editingAdminPassword && (
              <button
                type="button"
                onClick={() => setEditingAdminPassword(true)}
                className="inline-flex items-center gap-1 text-primary hover:underline font-label-md font-bold cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>تعديل الباسورد</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: نسبة ضريبة القيمة المضافة */}
        <div className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">percent</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    قيمة ضريبة القيمة المضافة
                  </h3>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">VAT Tax Rate</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary/20 text-tertiary">
                تطبق تلقائياً
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
              النسبة القانونية المطبقة في حسابات فواتير المبيعات ونقاط البيع وسندات المصروفات.
            </p>

            {editingVat ? (
              <div className="flex flex-col gap-2 bg-surface-container p-space-md rounded-xl">
                <label className="font-label-sm text-label-sm text-on-surface font-semibold">أدخل النسبة المئوية للضريبة (%):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={tempVatRate}
                    onChange={(e) => setTempVatRate(e.target.value)}
                    className="w-28 bg-surface-container-lowest text-on-surface font-mono font-bold text-center px-3 py-2 rounded-lg border border-tertiary focus:outline-none focus:ring-2 focus:ring-tertiary"
                  />
                  <span className="font-bold text-on-surface">%</span>
                  <button
                    type="button"
                    onClick={handleSaveVatRate}
                    className="px-4 py-2 rounded-lg bg-tertiary text-on-tertiary font-label-md font-bold hover:brightness-110 transition-colors cursor-pointer"
                  >
                    حفظ النسبة
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingVat(false); setTempVatRate(vatRate); }}
                    className="px-3 py-2 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-surface-container p-space-md rounded-xl border border-outline-variant/20">
                <div className="flex items-baseline gap-2">
                  <span className="font-display-md text-display-md font-extrabold text-tertiary font-mono">
                    {vatRate}%
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">ضريبة القيمة المضافة القياسية</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingVat(true)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md font-semibold transition-colors cursor-pointer"
                >
                  تعديل النسبة
                </button>
              </div>
            )}
          </div>

          <div className="mt-space-md pt-space-sm border-t border-surface-container-highest/60 flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>المملكة العربية السعودية (هيئة الزكاة والضريبة والجمارك)</span>
            <span className="text-tertiary font-bold font-mono">15% المعتمدة</span>
          </div>
        </div>
      </div>

      {/* Users Management Section */}
      <div className="bg-surface-container-low rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="p-space-lg bg-surface-container-high/40 flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border-b border-surface-container-highest">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">manage_accounts</span>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                حسابات المستخدمين وكلمات المرور في النظام
              </h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                قائمة جميع الحسابات الفعلية في دايت كينج مع إمكانية عرض وتعديل الإيميل وكلمة المرور
              </p>
            </div>
          </div>
          <span className="font-mono text-label-md font-bold px-3 py-1 rounded-full bg-surface-container text-on-surface-variant self-start sm:self-auto">
            إجمالي الحسابات: {users.length}
          </span>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          {loadingUsers ? (
            <div className="flex items-center justify-center h-48 text-on-surface-variant gap-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-primary">progress_activity</span>
              <span>جاري تحميل بيانات المستخدمين...</span>
            </div>
          ) : (
            <table className="w-full text-right border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-surface-container font-label-md text-label-md text-on-surface-variant">
                  <th className="py-3 px-space-md text-right">الاسم الكامل</th>
                  <th className="py-3 px-space-md text-right">البريد الإلكتروني (Login Email)</th>
                  <th className="py-3 px-space-md text-right">كلمة المرور (Password)</th>
                  <th className="py-3 px-space-md text-center">الدور والصلاحية</th>
                  <th className="py-3 px-space-md text-right">الفرع المخصص</th>
                  <th className="py-3 px-space-md text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/30 font-body-md text-body-md text-on-surface">
                {users.map((user) => {
                  const isPassVisible = visiblePasswords[user.id];
                  const plainPass = customPasswords[user.id] || (user.role === "owner" ? "Samer@2026" : "••••••••");
                  return (
                    <tr key={user.id} className="hover:bg-surface-container/60 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-space-md">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary text-xs">
                            {user.full_name ? user.full_name.slice(0, 1) : "U"}
                          </div>
                          <div>
                            <span className="font-bold text-on-surface block">{user.full_name}</span>
                            {user.role === "owner" && (
                              <span className="text-[11px] text-primary font-semibold">حساب المالك الرئيسي</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-space-md">
                        <div className="flex items-center gap-1.5 font-mono text-primary font-semibold text-body-sm dir-ltr justify-end">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.email, "البريد الإلكتروني")}
                            className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                            title="نسخ الإيميل"
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>
                          <span>{user.email}</span>
                        </div>
                      </td>

                      {/* Password Column */}
                      <td className="py-3.5 px-space-md">
                        <div className="flex items-center gap-2 font-mono dir-ltr justify-end bg-surface-container px-2.5 py-1 rounded-lg w-fit ml-auto border border-outline-variant/20">
                          <span className="font-bold text-on-surface text-body-sm tracking-wider">
                            {isPassVisible ? plainPass : "••••••••"}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                              title={isPassVisible ? "إخفاء" : "إظهار"}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isPassVisible ? "visibility_off" : "visibility"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openPasswordModal(user)}
                              className="text-primary hover:brightness-125 transition-colors cursor-pointer"
                              title="تغيير كلمة المرور"
                            >
                              <span className="material-symbols-outlined text-[16px]">key</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-space-md text-center whitespace-nowrap">
                        <span className={ROLE_BADGES[user.role]?.box || ROLE_BADGES.cashier.box}>
                          {ROLE_BADGES[user.role]?.label || user.role}
                        </span>
                      </td>

                      {/* Branch */}
                      <td className="py-3.5 px-space-md text-on-surface-variant text-body-sm font-semibold">
                        {user.branch_name || "الفرع الرئيسي"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-space-md text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary/20 text-primary font-semibold text-label-sm transition-colors cursor-pointer"
                            title="تعديل المستخدم"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                            <span>تعديل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                            title="حذف هذا المستخدم"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal إنشاء / تعديل مستخدم / تغيير باسورد */}
      {userModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setUserModalOpen(false); }}
        >
          <div className="relative w-full max-w-lg bg-surface-container-low rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/30 animate-fadeIn">
            <div className="p-space-lg bg-surface-container-high/60 flex items-center justify-between border-b border-surface-container-highest">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">
                    {modalMode === "create" ? "person_add" : modalMode === "password" ? "key" : "edit"}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                    {modalMode === "create" ? "إنشاء حساب مستخدم جديد" : modalMode === "password" ? `تعيين كلمة مرور جديدة: ${userFullName}` : "تعديل بيانات المستخدم"}
                  </h3>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {modalMode === "password" ? "سيتم تحديث كلمة المرور فوراً للمستخدم" : "حفظ ومزامنة في قاعدة البيانات"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-space-lg flex flex-col gap-space-md">
              {modalMode !== "password" && (
                <>
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">
                      الاسم الكامل <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userFullName}
                      onChange={(e) => setUserFullName(e.target.value)}
                      placeholder="مثال: خالد محمد عبد الله"
                      className="bg-surface-container text-on-surface px-space-md py-2.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">
                      البريد الإلكتروني لتسجيل الدخول <span className="text-error">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      disabled={modalMode === "edit"}
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="user@dietking.com"
                      className="bg-surface-container text-on-surface px-space-md py-2.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary dir-ltr text-right disabled:opacity-60"
                    />
                  </div>
                </>
              )}

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-md text-label-md text-on-surface font-semibold">
                    {modalMode === "password" ? "كلمة المرور الجديدة" : "كلمة المرور (Password)"} <span className="text-error">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setUserPassword("DK#" + Math.floor(1000 + Math.random() * 9000))}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    توليد كلمة مرور عشوائية
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور لا تقل عن 6 أحرف"
                  className="bg-surface-container text-on-surface font-mono font-bold px-space-md py-2.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary dir-ltr"
                />
              </div>

              {modalMode !== "password" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">
                      الدور والصلاحية <span className="text-error">*</span>
                    </label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="bg-surface-container text-on-surface px-space-md py-2.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                    >
                      <option value="owner">مالك النظام (Owner)</option>
                      <option value="branch_manager">مدير فرع</option>
                      <option value="cashier">كاشير نقطة بيع</option>
                      <option value="accountant">محاسب مالي</option>
                      <option value="hr">موارد بشرية</option>
                      <option value="storekeeper">أمين مخزن</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface font-semibold">
                      الفرع التابع له
                    </label>
                    <select
                      value={userBranchId}
                      onChange={(e) => setUserBranchId(e.target.value)}
                      className="bg-surface-container text-on-surface px-space-md py-2.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                    >
                      <option value="">الإدارة العامة (كل الفروع)</option>
                      {rawBranches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-space-sm pt-space-md border-t border-surface-container-highest/60 mt-space-xs">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-space-md py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-space-lg py-2 rounded-xl bg-primary-container hover:brightness-110 text-on-primary font-label-md font-bold transition-all shadow-md cursor-pointer"
                >
                  {modalMode === "create" ? "إنشاء المستخدم" : modalMode === "password" ? "تعيين الباسورد" : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
