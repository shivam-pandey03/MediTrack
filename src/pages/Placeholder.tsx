import { Construction } from "lucide-react";

export const Placeholder = ({ title, description }: { title: string; description: string }) => (
  <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
    <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
      <Construction className="size-6" />
    </div>
    <h2 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h2>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Placeholder;