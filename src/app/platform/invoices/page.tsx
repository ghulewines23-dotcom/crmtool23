"use client"
import { useAuth } from "@/lib/auth-context"
import { useCRMData } from "@/lib/crm-data-context"

export default function PlatformInvoicesPage() {
  const { user } = useAuth()
  const { invoices } = useCRMData()
  const orgInvoices = invoices.filter((i) => i.organizationId === user?.organizationId)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Invoices</h1>
      <div className="rounded-lg border border-border bg-white overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Number</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Client</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Amount</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left text-[11px] font-medium text-muted-foreground hidden md:table-cell">Due Date</th>
          </tr></thead>
          <tbody>
            {orgInvoices.map((i) => (
              <tr key={i.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 text-[13px] font-medium">{i.number}</td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{i.client}</td>
                <td className="px-4 py-3 text-[13px]">₹{i.amount.toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`text-[11px] px-2 py-0.5 rounded-full ${i.status === "paid" ? "bg-emerald-50 text-emerald-700" : i.status === "overdue" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}`}>{i.status}</span></td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground hidden md:table-cell">{i.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orgInvoices.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No invoices</p>}
      </div>
    </div>
  )
}
