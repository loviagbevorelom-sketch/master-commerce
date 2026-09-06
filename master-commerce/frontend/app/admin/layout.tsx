"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getToken } from "@/lib/admin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const isAuthPage =
      pathname.includes("/admin/login") ||
      pathname.includes("/admin/register");
    if (!isAuthPage && !getToken()) {
      window.location.href = "/admin/login";
    } else {
      setChecked(true);
    }
  }, [pathname]);

  return <>{children}</>;
}
