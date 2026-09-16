import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  UsersIcon,
  PhoneIcon,
  BarChart3Icon,
  UsersRoundIcon,
  FileBarChartIcon,
  UserCheckIcon,
  CheckIcon,
} from "lucide-react"

const features = [
  {
    icon: UsersIcon,
    title: "Lead Management",
    description:
      "Capture, organize, and track every lead in one place.",
  },
  {
    icon: PhoneIcon,
    title: "Calling & Follow-ups",
    description:
      "Make calls, log conversations, and schedule follow-ups.",
  },
  {
    icon: BarChart3Icon,
    title: "Sales Pipeline",
    description:
      "Visualize your entire sales process with drag-and-drop.",
  },
  {
    icon: UsersRoundIcon,
    title: "Team Management",
    description:
      "Assign leads, track performance, and collaborate seamlessly.",
  },
]

const pricingPlans = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    description: "Try Serene CRM free for 14 days.",
    features: ["Up to 100 leads", "3 team members", "Basic CRM", "Email support"],
    cta: "Start Free",
    href: "/signup",
    variant: "outline" as const,
  },
  {
    name: "Starter",
    price: "₹999",
    period: "/month",
    description: "For small teams getting started.",
    features: ["Up to 1,000 leads", "5 team members", "Full CRM + pipeline", "Priority support"],
    cta: "Get Started",
    href: "/signup?plan=starter",
    variant: "default" as const,
    popular: true,
  },
  {
    name: "Business",
    price: "₹1,999",
    period: "/month",
    description: "For growing businesses.",
    features: ["Up to 5,000 leads", "10 team members", "Everything in Starter", "API access"],
    cta: "Get Started",
    href: "/signup?plan=business",
    variant: "outline" as const,
  },
]

function HeroSection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-[48px] md:text-[56px] font-semibold leading-[1.1] tracking-tight text-[#1a1a1a]">
            Your leads, finally organized.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Simple CRM for growing businesses. Manage leads, follow-ups and deals from one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/signup" />}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/pricing" />}>
              View Pricing
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#1a1a1a]">
            Everything you need
          </h2>
          <p className="mt-3 text-muted-foreground">
            Powerful features designed to streamline your sales process.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="pt-5">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-4" />
                </div>
                <h3 className="text-base font-medium">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection() {
  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#1a1a1a]">
            Simple pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            No hidden fees. Choose the plan that fits your team.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.popular ? "border-primary" : ""}
            >
              <CardContent className="flex flex-1 flex-col pt-5">
                <h3 className="text-base font-medium">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant={plan.variant} render={<Link href={plan.href} />}>
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#1a1a1a]">
          Start managing your leads today
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Join teams already using Serene CRM to close more deals and grow revenue.
        </p>
        <div className="mt-8">
          <Button size="lg" render={<Link href="/signup" />}>
            Get Started — Free
          </Button>
        </div>
      </div>
    </section>
  )
}

export default function MarketingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <CTASection />
    </>
  )
}
