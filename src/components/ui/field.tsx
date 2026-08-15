import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/**
 * Form primitives. Controls are deliberately taller on small screens — the
 * forms are filled on a phone at the depot — and settle to the compact desktop
 * size from `sm` up.
 */
const CONTROL =
  "w-full rounded-[10px] border border-hairline bg-canvas px-3 py-3 text-[15px] text-ink transition-colors focus:border-ink-3 disabled:opacity-50 sm:py-2 sm:text-[13.5px]";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={htmlFor}
        className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-ink-2"
      >
        {label}
        {hint}
      </label>
      {children}
      {error && (
        <p role="alert" className="text-[12px] text-stop-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** Groups controls that have no single labellable element (the vehicle picker). */
export function FieldGroup({
  label,
  hint,
  error,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-ink-2">
        {label}
        {hint}
      </legend>
      {children}
      {error && (
        <p role="alert" className="text-[12px] text-stop-text">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function TextInput({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${CONTROL} ${className}`} />;
}

/** Numeric entry. Tabular figures and a numeric keypad on mobile. */
export function NumberInput({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      inputMode="decimal"
      autoComplete="off"
      {...rest}
      className={`${CONTROL} tnum ${className}`}
    />
  );
}

export function SelectInput({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${CONTROL} ${className}`}>
      {children}
    </select>
  );
}

export function TextArea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${CONTROL} ${className}`} />;
}

/** Sticky footer so Save stays in reach on a long mobile form. */
export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-2 flex flex-wrap gap-2.5 border-t border-hairline bg-surface px-4 py-3.5 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
      {children}
    </div>
  );
}
