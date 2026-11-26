/** Serializable state returned by form Server Actions via useActionState. */
export interface FormActionState {
  ok: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
}

export const EMPTY_FORM_STATE: FormActionState = {
  ok: false,
  message: null,
  fieldErrors: {},
};
