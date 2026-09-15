import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import schema from "../contract.schema.json" with { type: "json" };
import type { UiContract } from "./types.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateSchema = ajv.compile(schema);

export type ValidationResult =
  | { ok: true; contract: UiContract }
  | { ok: false; errors: string[] };

export function validateContract(candidate: unknown): ValidationResult {
  if (!validateSchema(candidate)) {
    return { ok: false, errors: formatErrors(validateSchema.errors) };
  }

  const contract = candidate as UiContract;
  const duplicateId = duplicate(contract.components.map((component) => component.id));
  const duplicateField = duplicate(
    contract.components
      .filter((component): component is Exclude<UiContract["components"][number], { type: "button" }> => component.type !== "button")
      .map((component) => component.name),
  );

  if (duplicateId || duplicateField) {
    return {
      ok: false,
      errors: [
        ...(duplicateId ? [`Duplicate component id: ${duplicateId}`] : []),
        ...(duplicateField ? [`Duplicate field name: ${duplicateField}`] : []),
      ],
    };
  }

  return { ok: true, contract };
}

function duplicate(values: string[]): string | undefined {
  return values.find((value, index) => values.indexOf(value) !== index);
}

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`);
}
