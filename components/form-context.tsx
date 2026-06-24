"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { z } from "zod/v4";

type FieldErrors = Record<string, string>;

const FormContext = createContext<{
  errors: FieldErrors;
  validate: (formData: FormData) => boolean;
  clearErrors: () => void;
  schema: z.ZodTypeAny | null;
}>({
  errors: {},
  validate: () => true,
  clearErrors: () => {},
  schema: null,
});

export function useFieldError(name: string): string | undefined {
  return useContext(FormContext).errors[name];
}

export function useFormContext() {
  return useContext(FormContext);
}

export function FormProvider({
  schema,
  children,
}: {
  schema?: z.ZodTypeAny;
  children: React.ReactNode;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = useCallback(
    (formData: FormData) => {
      if (!schema) return true;
      const result = schema.safeParse(Object.fromEntries(formData));
      if (result.success) {
        setErrors({});
        return true;
      }
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return false;
    },
    [schema],
  );

  const clearErrors = useCallback(() => setErrors({}), []);

  return (
    <FormContext.Provider value={{ errors, validate, clearErrors, schema: schema ?? null }}>
      {children}
    </FormContext.Provider>
  );
}
