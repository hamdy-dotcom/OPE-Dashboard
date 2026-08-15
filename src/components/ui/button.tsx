import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger";
};

const VARIANT = {
  default: "border-hairline bg-surface text-ink hover:bg-raise",
  primary: "border-ink bg-ink text-on-ink hover:opacity-90",
  danger: "border-stop bg-transparent text-stop-text hover:bg-stop-soft",
} as const;

export function Button({ variant = "default", className = "", ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`rounded-[10px] border px-3.5 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 ${VARIANT[variant]} ${className}`}
    />
  );
}
