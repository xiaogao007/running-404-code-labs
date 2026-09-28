import { z } from 'zod';
import { tool } from 'ai';

export const inputSchema = z.object({ orderId: z.string().regex(/^ORD-\d{3}$/) }).strict();
export const outputSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), orderId: z.string(), amountCents: z.number().int().nonnegative() }).strict(),
  z.object({ status: z.enum(['not_found', 'unavailable']) }).strict(),
]);
const records = [
  { orderId: 'ORD-001', tenant: 'alpha', amountCents: 12000 },
  { orderId: 'ORD-002', tenant: 'beta', amountCents: 98765 },
];

// trustedTenant comes from server authentication, never model arguments.
export function lookupOrder(raw, trustedTenant, { fail = false } = {}) {
  const input = inputSchema.parse(raw);
  if (!trustedTenant) throw new Error('Authentication required');
  if (fail) return outputSchema.parse({ status: 'unavailable' });
  const row = records.find(r => r.orderId === input.orderId && r.tenant === trustedTenant);
  return outputSchema.parse(row
    ? { status: 'ok', orderId: row.orderId, amountCents: row.amountCents }
    : { status: 'not_found' });
}

export function makeTools(trustedTenant, options, trace = []) {
  return { lookupOrder: tool({
    description: 'Look up one order in the authenticated tenant. not_found also covers inaccessible orders.',
    inputSchema,
    execute: async input => {
      const output = lookupOrder(input, trustedTenant, options);
      trace.push({ input, output });
      return output;
    },
  }) };
}
