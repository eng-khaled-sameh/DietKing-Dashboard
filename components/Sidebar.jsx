"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_ITEMS } from "../lib/config";
import { supabase } from "../lib/api";

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("dietking_user");
    }
    router.push("/login");
  }

  return (
    <aside
      className={`fixed right-0 top-0 h-full w-64 bg-surface-container-low z-50 flex flex-col py-space-lg shadow-[0_1px_8px_rgba(0,0,0,0.25)] transition-all duration-300
        ${isOpen ? "translate-x-0 opacity-100 visible pointer-events-auto" : "translate-x-full opacity-0 invisible pointer-events-none"}
        lg:translate-x-0 lg:opacity-100 lg:visible lg:pointer-events-auto`}
    >
      {/* Logo + close button */}
      <div className="px-space-lg mb-space-lg flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <img alt="دايت كينج" className="h-8 w-auto object-contain" src="/assets/images/logo.png" />
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-primary tracking-tight">دايت كينج</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">نظام إدارة المطاعم</span>
          </div>
        </div>
        {/* Close button – mobile only */}
        <button
          className="lg:hidden p-1 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
          onClick={onClose}
          type="button"
          aria-label="إغلاق القائمة"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <nav className="flex-1 px-space-sm flex flex-col gap-space-xs overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={`flex items-center gap-space-sm px-space-md py-space-sm transition-colors ${
                isActive
                  ? "bg-primary-container text-on-primary-container font-label-lg rounded-lg shadow-sm"
                  : "rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-body-md text-body-md"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* خيار تسجيل خروج مباشرة بعد التقارير والإدارة */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-error hover:bg-error-container/20 transition-colors font-body-md text-body-md cursor-pointer mt-1 text-right w-full"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>تسجيل خروج</span>
        </button>
      </nav>
    </aside>
  );
}
