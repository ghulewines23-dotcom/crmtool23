import Link from "next/link"

const productLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
]

const companyLinks = [
  { label: "Blog", href: "/about" },
  { label: "Careers", href: "/about" },
]

const supportLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Help", href: "/contact" },
]

function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-display text-lg font-semibold tracking-tight">
              Serene CRM
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Simple CRM for growing businesses.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Product</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Company</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">Support</h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border py-5">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Serene CRM. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

export { MarketingFooter }
