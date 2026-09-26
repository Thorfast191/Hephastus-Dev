import { startTransition } from "react";

/**
 * `onSubmit` handler for forms driven by `useActionState`.
 *
 * Passing the action straight to `<form action>` makes React reset every
 * uncontrolled field after each submission — so a server-side error ("email
 * already exists", "password too short") would also wipe what the admin
 * typed. Submitting through a transition keeps the values; forms that should
 * clear on success do it themselves.
 */
export function submitKeepingValues(formAction: (formData: FormData) => void) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
}
