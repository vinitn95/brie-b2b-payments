export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateAmount(amount: number): boolean {
  return amount > 0 && Number.isFinite(amount) && amount <= 1000000; // Max 1M SGD
}

export function validateBankAccount(accountNumber: string, routingNumber: string): boolean {
  // Basic validation for US bank accounts
  const accountRegex = /^\d{8,17}$/;
  const routingRegex = /^\d{9}$/;
  
  return accountRegex.test(accountNumber) && routingRegex.test(routingNumber);
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}