import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { UserRole } from "./auth"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * User-friendly labels for user roles
 */
export const UserRoleLabels: Record<string, string> = {
  [UserRole.BFAST_ADMIN]: "BFAST Administrator",
  [UserRole.BFAST_EXECUTIVE]: "BFAST Executive",
  [UserRole.CLIENT_ADMIN]: "Client Administrator",
  [UserRole.CLIENT_EXECUTIVE]: "Client Executive"
}
