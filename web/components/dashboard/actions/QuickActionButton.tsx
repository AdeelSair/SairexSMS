import Link from "next/link";

type QuickActionButtonProps = {
  label: string;
  href: string;
};

export function QuickActionButton({ label, href }: QuickActionButtonProps) {
  return (
    <Link
      href={href}
      className="rounded-xl border p-3 text-center text-sm font-medium transition hover:bg-accent"
    >
      {label}
    </Link>
  );
}
