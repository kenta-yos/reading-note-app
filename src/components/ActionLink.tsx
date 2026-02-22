"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Spinner from "./Spinner";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
  spinnerClassName?: string;
};

export default function ActionLink({
  href,
  children,
  className,
  spinnerClassName = "w-4 h-4",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={() => {
        if (loading) return;
        setLoading(true);
        router.push(href);
      }}
      disabled={loading}
      className={className}
    >
      {loading ? <Spinner className={spinnerClassName} /> : children}
    </button>
  );
}
