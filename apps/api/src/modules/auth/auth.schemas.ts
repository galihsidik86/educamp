import { z } from 'zod';

export const loginSchema = z.object({
  // boleh email ATAU NIM (mahasiswa); kita normalisasi di service
  identifier: z.string().min(3, 'Minimal 3 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
