import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HomePageHeader } from '@/components/common/HomePageHeader';
import {
  ShieldCheck,
  Users,
  Activity,
  Archive,
  FileText,
  KeyRound,
  Link2,
  Image,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const primaryFeatures = [
  {
    name: 'End-to-End Encryption',
    description: 'Military-grade encryption for all your sensitive data.',
    icon: ShieldCheck,
  },
  {
    name: 'Role-Based Access',
    description: 'Granular permissions for admins and users.',
    icon: Users,
  },
  {
    name: 'Activity Monitoring',
    description: 'Complete audit logs of all actions.',
    icon: Activity,
  },
  {
    name: 'Secure Storage',
    description: 'Documents, keys, and URLs in one place.',
    icon: Archive,
  },
];

const stats = [
    { name: 'AES Encryption', value: '256-bit' },
    { name: 'Uptime SLA', value: '99.9%' },
    { name: 'Companies Trust Us', value: '500+' },
    { name: 'Support Available', value: '24/7' },
]

const secondaryFeatures = [
    {
      name: 'Document Storage',
      description: 'Store contracts, reports, and sensitive documents with encryption.',
      icon: FileText,
    },
    {
      name: 'Environment Keys',
      description: 'Securely manage API keys, tokens, and credentials with access logs.',
      icon: KeyRound,
    },
    {
      name: 'Secure Links',
      description: 'Save and share important URLs with controlled access.',
      icon: Link2,
    },
    {
        name: 'Image Assets',
        description: 'Keep brand assets and other important images securely stored.',
        icon: Image,
    },
]


function FeatureCard({ icon: Icon, name, description }: { icon: LucideIcon; name: string; description: string }) {
    return (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/50 p-6 shadow-sm transition-all hover:border-primary/60 hover:shadow-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{name}</h3>
            <p className="text-muted-foreground">{description}</p>
        </div>
    );
}


export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <HomePageHeader />

      <main className="flex-1">
        <section className="relative w-full overflow-hidden py-20 sm:py-32 lg:py-40">
          <div className="container mx-auto max-w-7xl px-4 text-center">
            <div className="flex flex-col items-center gap-6">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    <Lock className="mr-2 h-4 w-4"/>
                    Enterprise-Grade Security
                </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                Your Company's Data, <br className="md:hidden" />
                <span className="text-blue-400">Secured & Centralized</span>
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground sm:text-xl">
                VaultSpace provides a single, secure platform to store documents, environment keys, URLs, and critical company data with role-based access and complete audit trails.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/signup">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:py-32">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                {primaryFeatures.map((feature) => (
                    <FeatureCard key={feature.name} {...feature} />
                ))}
            </div>

            <div className="mt-16 grid grid-cols-2 gap-8 border-t border-border pt-16 sm:grid-cols-4 lg:mt-24 lg:pt-24">
              {stats.map((stat) => (
                <div key={stat.name} className="flex flex-col items-center gap-2">
                  <dt className="text-sm font-medium text-muted-foreground">{stat.name}</dt>
                  <dd className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">{stat.value}</dd>
                </div>
              ))}
            </div>
        </section>

        <section className="bg-card/20 py-16 sm:py-24 lg:py-32">
            <div className="container mx-auto max-w-7xl px-4">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Store Everything Securely</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        One platform for all your company&apos;s critical data, with role-based access and complete transparency.
                    </p>
                </div>
                <div className="mx-auto mt-16 grid max-w-none grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                    {secondaryFeatures.map((feature) => (
                        <FeatureCard key={feature.name} {...feature} />
                    ))}
                </div>
            </div>
        </section>

      </main>

      <footer className="border-t border-border/40 py-6">
        <div className="container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} VaultSpace. All rights reserved.</p>
            <div className="flex gap-4">
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</Link>
            </div>
        </div>
      </footer>
    </div>
  );
}
