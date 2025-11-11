import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, KeyRound, Users, FileText, Link2, Image, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HomePageHeader } from '@/components/common/HomePageHeader';

const primaryFeatures = [
  {
    name: 'End-to-End Encryption',
    description: 'All assets are encrypted at rest and in transit, ensuring your data is always secure.',
    icon: ShieldCheck,
  },
  {
    name: 'Role-Based Access Control',
    description: 'Fine-grained permissions to control who can view, edit, and manage assets.',
    icon: Users,
  },
  {
    name: 'Secure Key Management',
    description: 'Safely store and distribute API keys and other sensitive credentials.',
    icon: KeyRound,
  },
];

const secondaryFeatures = [
  {
    name: 'Document Storage',
    description: 'Upload and manage important documents like PDFs, reports, and legal agreements.',
    icon: FileText,
  },
  {
    name: 'Secure Links',
    description: 'Store and share important URLs securely, knowing they haven\'t been tampered with.',
    icon: Link2,
  },
  {
    name: 'Image Assets',
    description: 'Keep your brand assets, mockups, and other images in a centralized, secure location.',
    icon: Image,
  },
  {
    name: 'Environment Keys',
    description: 'Manage and rotate environment variables and API keys for all your applications.',
    icon: KeyRound,
  },
];

const stats = [
    { name: 'Encryption Standard', value: '256-bit AES' },
    { name: 'Uptime SLA', value: '99.9%' },
    { name: 'Compliance', value: 'SOC 2 Type II' },
    { name: 'Support', value: '24/7 Priority' },
]

function FeatureCard({ icon: Icon, name, description }: { icon: LucideIcon; name: string; description: string }) {
    return (
        <div className="flex flex-col items-center p-6 text-center bg-card rounded-lg shadow-md">
            <div className="flex items-center justify-center w-12 h-12 mb-4 text-primary bg-primary/10 rounded-full">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{name}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}


export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HomePageHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 text-center bg-card">
          <div className="container mx-auto px-4">
             <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
              <Lock className="w-4 h-4 mr-2" />
              Enterprise-Grade Security
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl">
              Your Company&apos;s Data, <br />
              <span className="text-primary">Secured & Centralized</span>
            </h1>
            <p className="max-w-2xl mx-auto mt-6 text-lg text-muted-foreground">
              VaultSpace provides a single source of truth for your company’s most sensitive digital assets, from API keys to legal documents, with robust access controls and end-to-end encryption.
            </p>
          </div>
        </section>

        {/* Primary Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-3xl font-bold text-center">Uncompromising Security for Your Digital Assets</h2>
            <div className="grid gap-8 md:grid-cols-3">
              {primaryFeatures.map((feature) => (
                <FeatureCard key={feature.name} {...feature} />
              ))}
            </div>
          </div>
        </section>
        
        {/* Stats Section */}
        <section className="py-20 bg-card">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.name} className="flex flex-col items-center">
                    <p className="text-4xl font-bold text-primary">{stat.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{stat.name}</p>
                    </div>
                ))}
                </div>
            </div>
        </section>

        {/* Secondary Features (What you can store) */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-3xl font-bold text-center">A Central Vault for All Your Assets</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {secondaryFeatures.map((feature) => (
                 <Card key={feature.name}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <feature.icon className="w-6 h-6 text-primary" />
                            <span>{feature.name}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 text-center border-t bg-card">
        <div className="container mx-auto px-4">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} VaultSpace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
