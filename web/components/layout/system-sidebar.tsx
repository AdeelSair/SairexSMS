import { cn } from "@/lib/utils";

export function SystemSidebar(props: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn("text-white", props.className)}
      style={{
        background:
          "linear-gradient(180deg, #0F2F57 0%, #1D4E89 40%, #1FA2A6 75%, #39B54A 100%)",
      }}
    >
      {props.children}
    </aside>
  );
}

