import { containsProfanity } from './profanity/index.js';
import { z } from 'zod';
export const fullName = z
  .string()
  .trim()
  .max(120)
  .refine(
    (value) =>
      /^\p{L}[\p{L}\p{M}'’-]*(?:\s+\p{L}[\p{L}\p{M}'’-]*)+$/u.test(value),
    'Enter your first and last name using letters, spaces, apostrophes or hyphens.',
  );
export const strongPassword = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (v) =>
      /[a-z]/.test(v) &&
      /[A-Z]/.test(v) &&
      /[0-9]/.test(v) &&
      /[^A-Za-z0-9\s]/.test(v),
    'Use 12–72 characters including uppercase, lowercase, a number and a special character.',
  );
export const profileSchema = z
  .object({
    fullName: fullName.refine(
      (v) => !containsProfanity(v),
      'Please use appropriate language.',
    ),
    studyTrack: z.enum(['IT', 'Business']),
    studyYear: z.number().int().min(1).max(4),
  })
  .strict();
export const registrationSchema = profileSchema
  .extend({
    email: z.string().trim().email().max(254),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords must match.',
    path: ['confirmPassword'],
  });
