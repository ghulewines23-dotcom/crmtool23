import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckIcon } from "lucide-react"
import { cn } from "cn"

const plans = [
  {
    name: "Free Trial",
    description: "Try Serene CRM with full access.",
    price: "₹0",
    period: "7 days",
    features: [
      { text: "Up to 1 user", included: true },
      { text: "20 leads", included: true },
      { text: "Lead management", included: true },
      { text: "Sales pipeline", included: true },
      { text: "Basic reports", included: true },
      { text: "Email support", included: true },
      { text: "API access", included: false },
      { text: "Dedicated manager", included: false },
    ],
    cta: "Start Free Trial",
    href: "/signup?plan=FREE_TRIAL",
    variant: "outline" as const,
  },
  {
    name: "Starter",
    description: "Everything your team needs to close deals.",
    price: "₹1,000",
    period: "/month",
    features: [
      { text: "Up to 3 members", included: true },
      { text: "50 leads", included: true },
      { text: "Lead management", included: true },
      { text: "Sales pipeline", included: true },
      { text: "Advanced reports", included: true },
      { text: "Priority support", included: true },
      { text: "API access", included: false },
      { text: "Dedicated manager", included: false },
    ],
    cta: "Get Started",
    href: "/signup?plan=STARTER",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Growth",
    description: "Advanced features for growing teams.",
    price: "₹3,000",
    period: "/month",
    features: [
      { text: "Up to 5 members", included: true },
      { text: "200 leads", included: true },
      { text: "Everything in Starter", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Dedicated support", included: true },
      { text: "Priority support", included: true },
      { text: "Full API access", included: true },
      { text: "Dedicated manager", included: false },
    ],
    cta: "Get Started",
    href: "/signup?plan=GROWTH",
    variant: "outline" as const,
  },
  {
    name: "Pro",
    description: "Enterprise-grade for large teams.",
    price: "₹5,000",
    period: "/month",
    features: [
      { text: "Up to 10 members", included: true },
      { text: "300 leads", included: true },
      { text: "Everything in Growth", included: true },
      { text: "Full analytics suite", included: true },
      { text: "Dedicated support", included: true },
      { text: "Priority support", included: true },
      { text: "Full API access", included: true },
      { text: "Dedicated manager", included: true },
    ],
    cta: "Get Started",
    href: "/signup?plan=PRO",
    variant: "outline" as const,
  },
]

export default function PricingPage() {
  return (
    <>
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl text-[#1a1a1a]">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              No hidden fees. No surprises. Choose the plan that fits your team.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-4">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative flex flex-col",
                  plan.popular && "border-primary"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most Popular
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col pt-5">
                  <h3 className="text-base font-medium">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <ul className="mt-6 space-y-2.5 flex-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature.text}
                        className={cn(
                          "flex items-start gap-2 text-sm",
                          !feature.included && "text-muted-foreground/50"
                        )}
                      >
                        <CheckIcon
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            feature.included
                              ? "text-primary"
                              : "text-muted-foreground/30"
                          )}
                        />
                        {feature.text}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-6 w-full"
                    variant={plan.variant}
                    render={<Link href={plan.href} />}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#1a1a1a]">
            Need a custom plan?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            We offer tailored solutions for large teams. Contact us for a custom quote.
          </p>
          <div className="mt-8">
            <Button size="lg" variant="outline" render={<Link href="/contact" />}>
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
