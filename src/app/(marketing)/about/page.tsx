import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TargetIcon, HeartIcon, LightbulbIcon, UsersIcon } from "lucide-react"

const values = [
  {
    icon: TargetIcon,
    title: "Customer First",
    description:
      "Every decision we make starts with our customers. We solve real problems for sales teams.",
  },
  {
    icon: HeartIcon,
    title: "Simplicity Wins",
    description:
      "Great software should feel invisible. Serene CRM gets out of your way so you can focus on selling.",
  },
  {
    icon: LightbulbIcon,
    title: "Relentless Innovation",
    description:
      "The sales landscape evolves fast. We ship updates weekly and stay ahead of the curve.",
  },
  {
    icon: UsersIcon,
    title: "Built Together",
    description:
      "We build Serene CRM alongside our customers. Your feedback shapes our roadmap.",
  },
]

const team = [
  { name: "Arjun Mehta", role: "CEO & Co-founder", initials: "AM" },
  { name: "Sneha Kapoor", role: "CTO & Co-founder", initials: "SK" },
  { name: "Vikram Singh", role: "Head of Product", initials: "VS" },
  { name: "Priya Nair", role: "Head of Customer Success", initials: "PN" },
  { name: "Rohan Gupta", role: "Head of Engineering", initials: "RG" },
  { name: "Ananya Das", role: "Head of Marketing", initials: "AD" },
]

export default function AboutPage() {
  return (
    <>
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl text-[#1a1a1a]">
              About Serene CRM
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              We believe every sales team deserves a CRM that works as hard as they do.
              Serene CRM was built to eliminate scattered leads, missed follow-ups,
              and guesswork — replacing it with clarity and results.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Serene CRM started in 2023 when our founders experienced the frustration
              of managing sales at a fast-growing startup. They watched brilliant deals
              slip through the cracks because the team was juggling spreadsheets and
              disconnected tools.
            </p>
            <p>
              They built Serene CRM with a simple thesis: sales software should be powerful
              enough for enterprises but simple enough for a two-person team to start
              using in minutes.
            </p>
            <p>
              Today, Serene CRM is trusted by over 2,000 sales teams across India. From
              bootstrapped startups to established enterprises, we help them capture
              more leads, close more deals, and grow revenue — faster.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#1a1a1a]">
              Our Values
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <Card key={value.title}>
                <CardContent className="pt-5">
                  <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <value.icon className="size-4" />
                  </div>
                  <h3 className="text-base font-medium">{value.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#1a1a1a]">
              Meet the Team
            </h2>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member) => (
              <Card key={member.name}>
                <CardContent className="pt-5 text-center">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold">
                    {member.initials}
                  </div>
                  <h3 className="text-base font-medium">{member.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{member.role}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl text-[#1a1a1a]">
            Join us on the journey
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            We&apos;re always looking for talented people who share our passion for building great software.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/contact" />}>
              Get in Touch
            </Button>
            <Button size="lg" variant="outline" render={<Link href="/signup" />}>
              Try Serene CRM Free
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
