import { messages } from "../messages.nb";
import { Button } from "./button";

// «Vis» / «Skjul» for password and Access-code fields (UX-DR10). A small
// secondary button, 44 px, right of the field.
export function PasswordToggle({
  shown,
  onToggle,
  controls,
}: {
  shown: boolean;
  onToggle: () => void;
  controls: string;
}) {
  return (
    <Button
      small
      variant="secondary"
      aria-pressed={shown}
      aria-controls={controls}
      onClick={onToggle}
    >
      {shown ? messages.passwordToggle.hide : messages.passwordToggle.show}
    </Button>
  );
}
