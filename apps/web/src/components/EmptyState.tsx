import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

type Props = {
  /** Default: ikon Inbox. Bisa diganti Lucide icon lain. */
  icon?: ReactNode;
  title: string;
  /** Penjelasan ramah, biasanya 1 kalimat. */
  description?: string;
  /** Tombol CTA opsional — biasanya "Tambah ..." / "Coba lagi". */
  action?: ReactNode;
};

/**
 * Halaman/section kosong dengan ikon + judul + deskripsi.
 * Lebih ramah daripada teks polos "Tidak ada data".
 */
export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        {icon ?? <Inbox size={28} />}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
