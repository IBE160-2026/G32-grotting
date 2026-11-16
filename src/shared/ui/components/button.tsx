import type { ComponentProps } from "react";

type Variant = "primary" | "secondary";

type ButtonProps = Omit<ComponentProps<"button">, "disabled"> & {
  variant?: Variant;
  small?: boolean;
  disabled?: boolean;
  // A running request: still focusable, label kept, clicks ignored (NFR-5).
  busy?: boolean;
};

const BASE =
  "inline-flex items-center justify-center gap-2 border font-sans transition-colors duration-160 ease-out";

const VARIANT = {
  primary:
    "border-ink bg-ink text-ground hover:bg-button-primary-hover active:bg-sand",
  secondary:
    "border-edge bg-transparent text-ink hover:border-ink hover:bg-lift active:bg-lift-2",
} as const;

const SIZE = {
  standard: "min-h-control-height px-5 text-button",
  small: "min-h-touch-target px-3.5 text-button-sm",
} as const;

const DISABLED =
  "cursor-not-allowed border-disabled-edge bg-transparent text-disabled-ink";

type ButtonLook = {
  small?: boolean;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
};

// The one source of the button look: Button and Link kind="button" both use it.
export function buttonClasses(
  variant: Variant = "primary",
  { small = false, disabled = false, busy = false, className }: ButtonLook = {},
) {
  return [
    BASE,
    SIZE[small ? "small" : "standard"],
    disabled ? DISABLED : VARIANT[variant],
    busy ? "cursor-progress" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

// An 18 px square-capped arc; it turns only when motion is allowed.
function ProgressGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="motion-safe:animate-spin"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  small = false,
  disabled = false,
  busy = false,
  type = "button",
  className,
  onClick,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled}
      aria-disabled={busy ? "true" : undefined}
      className={buttonClasses(variant, { small, disabled, busy, className })}
      onClick={
        busy
          ? (event) => {
              event.preventDefault();
            }
          : onClick
      }
    >
      {busy ? <ProgressGlyph /> : null}
      {children}
    </button>
  );
}
