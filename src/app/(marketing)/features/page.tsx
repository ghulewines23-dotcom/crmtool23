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
  BellIcon,
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  MessageSquareIcon,
  LockIcon,
} from "lucide-react"

const mainFeatures = [
  {
    icon: UsersIcon,
    title: "Lead Management",
    description:
      "Capture leads from multiple sources, assign them to team members, and track every interaction from first touch to close.",
  },
  {
    icon: PhoneIcon,
    title: "Calling & Follow-ups",
    description:
      "Make and record calls directly from Serene CRM. Log notes, schedule follow-ups, and never miss an opportunity.",
  },
  {
    icon: BarChart3Icon,
    title: "Sales Pipeline",
    description:
      "Visualize your entire sales process with a customizable drag-and-drop pipeline. Forecast revenue and spot bottlenecks.",
  },
  {
    icon: UsersRoundIcon,
    title: "Team Management",
    description:
      "Manage your entire sales team from one dashboard. Assign leads, track performance, and keep everyone aligned.",
  },
  {
    icon: FileBarChartIcon,
    title: "Reports & Analytics",
    description:
      "Get real-time insights into your sales performance. Custom dashboards, automated reports, data-driven decisions.",
  },
  {
    icon: UserCheckIcon,
    title: "Client Management",
    description:
      "Build complete client profiles with every interaction, document, and note in one place. Stronger relationships with data.",
  },
]

const additionalFeatures = [
  { icon: BellIcon, title: "Smart Notifications", description: "Get alerted to important activities before they slip through." },
  { icon: SearchIcon, title: "Advanced Search", description: "Find any lead, deal, or client in seconds with powerful filters." },
  { icon: FilterIcon, title: "Custom Filters", description: "Create saved views and custom filters to focus on what matters." },
  { icon: CalendarIcon, title: "Calendar Sync", description: "Two-way sync with Google Calendar and Outlook. Never double-book." },
  { icon: MessageSquareIcon, title: "Team Chat", description: "Built-in messaging to collaborate on deals and share updates." },
  { icon: LockIcon, title: "Enterprise Security", description: "SOC 2 compliant, encrypted at rest, and GDPR ready." },
]

export default function FeaturesPage() {
  return (
    <>
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl text-[#1a1a1a]">
              Everything you need
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Everything you need to capture leads, manage pipelines, and close deals faster.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mainFeatures.map((feature) => (
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

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#1a1a1a]">
              And so much more
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every feature designed to help you sell smarter, not harder.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {additionalFeatures.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-5">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-4" />
                  </div>
                  <h3 className="text-sm font-medium">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#1a1a1a]">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Start your free trial today. No credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/signup" />}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/pricing" />}>
              View Pricing
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
