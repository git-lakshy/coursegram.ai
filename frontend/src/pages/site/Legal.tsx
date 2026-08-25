import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { SiteFooter, SiteNav } from "@/components/site/SitePage"

const SECTIONS = [
  {
    title: "Privacy Policy",
    body: [
      "Coursegram collects the minimum information needed to run the product. When you create an account we store your email address and basic profile details. As you use the app we store your learning goal, your quiz responses, your generated roadmap, and the topics you mark complete. This data exists for one reason: to build and adapt your personalized learning path.",
      "We do not sell your personal data. We do not share it with advertisers or data brokers. We do not use your learning history to target you with third party promotions.",
      "Account authentication is handled through Firebase, which processes your login credentials on our behalf. Application data such as roadmaps and progress records are stored in a managed Neon Postgres database. Both providers process data under their own security and compliance programs.",
      "You can request deletion of your account and associated data at any time by contacting us. We will remove your profile, progress, and roadmap records from our systems within thirty days of a verified request.",
      "If this policy changes in a material way, we will notify you through the product before the changes take effect.",
    ],
  },
  {
    title: "Terms of Service",
    body: [
      "By creating an account you agree to use Coursegram for lawful learning purposes. The service is provided to help individuals plan and track their education. You may not attempt to disrupt the service, scrape it at scale, resell access, or use it to generate content that violates applicable law.",
      "You are responsible for keeping your account credentials secure and for the activity that happens under your account. If you suspect unauthorized access, change your password immediately and contact us.",
      "The content recommended inside Coursegram, including third party courses from providers like Coursera, remains the property of its respective owners. Coursegram links to and organizes that content but does not claim ownership of it.",
      "The service is provided on an AS IS and AS AVAILABLE basis without warranties of any kind, express or implied, including merchantability and fitness for a particular purpose. We do not guarantee that completing a roadmap will result in any specific career or salary outcome.",
      "We may update these terms as the product evolves. Continued use of Coursegram after an update constitutes acceptance of the revised terms.",
    ],
  },
  {
    title: "Refund Policy",
    body: [
      "Coursegram is currently free to use. There is nothing to purchase and therefore nothing to refund for individual learners today.",
      "If paid features are introduced in the future, this policy will be updated before any charge occurs. Our commitment for any future paid subscription is simple: if you cancel within fourteen days of your first payment, you receive a full refund, no questions asked.",
      "For institutional agreements, refund terms will be defined in the specific contract signed with each organization rather than in this general policy.",
      "Questions about billing or refunds can always be sent to our support email and we will respond within two business days.",
    ],
  },
  {
    title: "Cookies Policy",
    body: [
      "Coursegram uses browser storage sparingly and deliberately. We store a session token in localStorage so you stay logged in between visits, and we store your progress state so completed topics persist across devices and sessions.",
      "When you sign in, Firebase may set cookies necessary for authentication and for protecting the service against abuse. These cookies are essential to operating the product and cannot be disabled without breaking sign in.",
      "We may use Firebase Analytics to understand aggregate usage patterns, such as which pages are visited and where users drop off. This data is anonymized and used only to improve the product.",
      "You can opt out of analytics tracking by blocking cookies from firebaseio.com in your browser settings or by using a tracking blocker. Clearing your browser storage will also log you out and reset locally stored progress on that device, so we recommend signing in with the same account rather than relying solely on local storage.",
    ],
  },
]

export default function Legal() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl px-6 py-14">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink-primary md:text-5xl">
          Legal and Policies
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          Plain language versions of how we handle your data, what you can expect from the service,
          and where things stand on refunds and cookies. Last updated August 2026.
        </p>

        <Accordion className="mt-10">
          {SECTIONS.map((section) => (
            <AccordionItem key={section.title}>
              <AccordionTrigger>
                <span className="text-sm font-medium text-ink-primary">{section.title}</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {section.body.map((paragraph, index) => (
                    <p key={index} className="text-sm leading-relaxed text-ink-secondary">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <SiteFooter />
    </div>
  )
}
