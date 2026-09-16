import { MarketingHeader } from "@/components/website/marketing-header"
import { MarketingFooter } from "@/components/website/marketing-footer"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <MarketingHeader />
      <main className="flex-1 pt-14">{children}</main>
      <MarketingFooter />
    </div>
  )
}
