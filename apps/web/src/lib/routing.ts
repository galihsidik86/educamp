import type { Role } from './auth';

export const roleHomePath = (role: Role): string => {
  switch (role) {
    case 'mahasiswa': return '/mahasiswa';
    case 'dosen':     return '/dosen';
    case 'akademik':  return '/akademik';
    case 'wali':      return '/wali';
  }
};
