"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MailIcon, PhoneIcon, MapPinIcon, SendIcon } from "lucide-react"

const contactInfo = [
  {
    icon: MailIcon,
    title: "Email",
    value: "hello@leadflow.in",
    description: "We reply within 24 hours",
  },
  {
    icon: PhoneIcon,
    title: "Phone",
    value: "+91 98765 43210",
    description: "Mon–Fri, 9am–6pm IST",
  },
  {
    icon: MapPinIcon,
    title: "Office",
    value: "Koramangala, Bengaluru",
    description: "Karnataka, India 560034",
  },
]

export default function ContactPage() {
  const [submitted, setSubmitted] = React.useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <>
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl text-[#1a1a1a]">
              Get in touch
            </h1>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Have a question or need a demo? We&apos;d love to hear from you.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-10 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="pt-5">
                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-14 text-center">
                      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <SendIcon className="size-5" />
                      </div>
                      <h3 className="text-lg font-medium">Message sent</h3>
                      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                        Thanks for reaching out. We&apos;ll get back to you within 24 hours.
                      </p>
                      <Button
                        className="mt-5"
                        variant="outline"
                        onClick={() => setSubmitted(false)}
                      >
                        Send another
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" name="name" placeholder="John Doe" required />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" name="email" type="email" placeholder="john@company.com" required />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="Tell us about your needs..."
                          className="min-h-[120px]"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full sm:w-auto">
                        <SendIcon className="size-4" />
                        Send Message
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              {contactInfo.map((info) => (
                <Card key={info.title}>
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <info.icon className="size-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">{info.title}</h3>
                        <p className="mt-0.5 text-sm font-medium">{info.value}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
