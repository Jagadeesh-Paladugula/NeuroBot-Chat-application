/**
 * Input sanitization utilities
 * Prevents XSS attacks and validates user inputs
 */

/**
 * Sanitizes HTML content by removing potentially dangerous tags and attributes
 */
export function sanitizeHtml(html: string): string {
  // Create a temporary div element
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

/**
 * Sanitizes plain text by escaping HTML entities
 */
export function sanitizeText(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Optional: Add more password strength checks
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }
  // if (!/[a-z]/.test(password)) {
  //   errors.push('Password must contain at least one lowercase letter');
  // }
  // if (!/[0-9]/.test(password)) {
  //   errors.push('Password must contain at least one number');
  // }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes and validates name input
 */
export function sanitizeName(name: string): string {
  // Remove leading/trailing whitespace
  let sanitized = name.trim();
  
  // Remove any HTML tags
  sanitized = sanitizeText(sanitized);
  
  // Decode HTML entities back to text (since sanitizeText encodes them)
  const div = document.createElement('div');
  div.innerHTML = sanitized;
  sanitized = div.textContent || div.innerText || '';
  
  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }
  
  return sanitized;
}

/**
 * Sanitizes message text
 */
export function sanitizeMessage(message: string): string {
  // Remove leading/trailing whitespace
  let sanitized = message.trim();
  
  // Remove any HTML tags but preserve newlines
  sanitized = sanitizeText(sanitized);
  
  // Decode HTML entities
  const div = document.createElement('div');
  div.innerHTML = sanitized;
  sanitized = div.textContent || div.innerText || '';
  
  // Limit length (adjust based on your requirements)
  const maxLength = 10000;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validates phone number format (basic validation)
 */
export function validatePhone(phone: string): boolean {
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Check if it contains only digits and optional + at start
  return /^\+?[1-9]\d{1,14}$/.test(cleaned);
}

/**
 * Sanitizes phone number
 */
export function sanitizePhone(phone: string): string {
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Validates URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

