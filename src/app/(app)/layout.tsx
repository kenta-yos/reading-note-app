import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import FloatingAddButton from "@/components/FloatingAddButton";
import PullToRefresh from "@/components/ui/PullToRefresh";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex min-h-screen">
        {/* PC only sidebar */}
        <Sidebar />
        {/* pb-32 on mobile: floating nav (64px) + 12px gap + safe-area clearance */}
        <main className="flex-1 p-4 lg:p-8 pb-32 lg:pb-8 overflow-auto">
          <PullToRefresh>
            <div className="animate-page-enter">
              {children}
            </div>
          </PullToRefresh>
        </main>
      </div>
      {/* Mobile only */}
      <FloatingAddButton />
      <BottomNav />
    </>
  );
}
