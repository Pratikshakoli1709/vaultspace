import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-8", className)}
      {...props}
    >
      <title>VaultSpace Logo</title>
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent-foreground))" />
        </linearGradient>
      </defs>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#logoGradient)" stroke="none" />
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="hsl(var(--primary))" />
      <path
        d="M12 7v4l2.5 1.5"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1.5"
      />
      <path
        d="M12 11.5L9.5 13"
        stroke="hsl(var(--primary-foreground))"
        strokeWidth="1.5"
      />
    </svg>
  );
}
