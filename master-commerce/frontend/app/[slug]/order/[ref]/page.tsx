import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import OrderTicket from "@/components/OrderTicket";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
}: {
  params: { slug: string; ref: string };
}) {
  let order;
  try {
    order = await api.getOrder(params.ref);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader slug={params.slug} name={order.shop_name} />
      <main className="flex-1 pt-20 sm:pt-24 md:pt-28 pb-16 page-enter">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <span className="text-sm text-muted mb-6 block">
            Commande {order.ref}
          </span>
          <OrderTicket slug={params.slug} order={order} />
        </div>
      </main>
      <SiteFooter name={order.shop_name} />
    </div>
  );
}