import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

/** bcrypt cost factor — must stay >= 12. */
export const BCRYPT_COST = 12;

const MIN_LENGTH = 12;
const MAX_LENGTH = 128;
const MIN_UNIQUE_CHARS = 8;
/** Rough Shannon-entropy floor for a 12+ char password (bits). */
const MIN_ENTROPY_BITS = 40;

const COMMON_PASSWORDS = new Set(
  [
    "password",
    "password123",
    "password123!",
    "changeme",
    "changeme123",
    "admin123",
    "admin@123",
    "welcome123",
    "qwerty123",
    "letmein123",
    "propos123",
    "propos@123",
  ].map((p) => p.toLowerCase()),
);

/**
 * Approximate Shannon entropy in bits for the password string.
 */
export function passwordEntropyBits(password: string): number {
  if (!password) return 0;
  const freq = new Map<string, number>();
  for (const ch of password) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  const len = password.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy * len;
}

export function validatePasswordStrength(password: string): string | null {
  if (typeof password !== "string" || password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters`;
  }
  if (password.length > MAX_LENGTH) {
    return `Password must be at most ${MAX_LENGTH} characters`;
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter";
  }
  if (!/\d/.test(password)) {
    return "Password must include a digit";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include a special character";
  }
  const unique = new Set(password).size;
  if (unique < MIN_UNIQUE_CHARS) {
    return `Password must contain at least ${MIN_UNIQUE_CHARS} unique characters`;
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "Password is too common";
  }
  if (passwordEntropyBits(password) < MIN_ENTROPY_BITS) {
    return "Password entropy is too low — use a longer or more varied passphrase";
  }
  return null;
}

@ValidatorConstraint({ name: "isStrongPassword", async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === "string" && validatePasswordStrength(value) === null;
  }

  defaultMessage(): string {
    return `Password must be ${MIN_LENGTH}+ chars with upper, lower, digit, special character, and sufficient entropy`;
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}
