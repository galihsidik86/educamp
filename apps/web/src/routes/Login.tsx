import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Alert } from '@/ds';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { roleHomePath } from '@/lib/routing';
import { useInstitusiPublic } from '@/lib/queries-institusi';

const schema = z.object({
  identifier: z.string().min(3, 'Masukkan email atau NIM'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type FormData = z.infer<typeof schema>;

export function Login() {
  const { state, login } = useAuth();
  const inst = useInstitusiPublic();
  const namaPendek = inst.data?.namaPendek || inst.data?.nama || 'STMIK Tazkia';
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  });

  if (state.status === 'authenticated') {
    const redirect = (location.state as { from?: string } | null)?.from ?? roleHomePath(state.user.role);
    return <Navigate to={redirect} replace />;
  }

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const user = await login(data.identifier, data.password);
      navigate(roleHomePath(user.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setServerError(err.message);
      else setServerError('Terjadi kesalahan, silakan coba lagi');
    }
  };

  return (
    <div className="login">
      <aside className="login__brand">
        <div>
          <span className="login__eyebrow">PORTAL AKADEMIK</span>
          <div className="login__hero">
            <h1>Assalamu'alaikum,<br/>selamat datang di SIAKAD {namaPendek}</h1>
            <p>Akses Kartu Rencana Studi, jadwal, nilai, keuangan, dan layanan Tri Dharma dalam satu portal.</p>
          </div>
        </div>
        <div>
          <small style={{ opacity: 0.7 }}>{namaPendek}{inst.data?.tagline ? ` · ${inst.data.tagline}` : ''}</small>
        </div>
      </aside>

      <section className="login__form-wrap">
        <form className="login__form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <h2>Masuk ke akun Anda</h2>

          {serverError && <Alert variant="danger" title="Gagal masuk">{serverError}</Alert>}

          <div>
            <Input
              label="Email atau NIM"
              placeholder="contoh: 2021110001 atau nama@tazkia.ac.id"
              autoComplete="username"
              {...register('identifier')}
            />
            {errors.identifier && <div className="field-error">{errors.identifier.message}</div>}
          </div>

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="Masukkan password"
              autoComplete="current-password"
              {...register('password')}
            />
            {errors.password && <div className="field-error">{errors.password.message}</div>}
          </div>

          <Button type="submit" variant="primary" size="lg" block disabled={isSubmitting}>
            {isSubmitting ? 'Memproses…' : 'Masuk'}
          </Button>

          <p className="muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center' }}>
            Lupa password? Hubungi BAAK {namaPendek}.
          </p>
        </form>
      </section>
    </div>
  );
}
