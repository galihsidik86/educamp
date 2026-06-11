import { useDosenPenelitian, usePenelitianActions } from '@/lib/queries-dosen';
import { KegiatanList, type Kegiatan } from '@/components/KegiatanForm';

export function DosenPenelitian() {
  const { data, isLoading } = useDosenPenelitian();
  const { create, remove, addAnggota, removeAnggota } = usePenelitianActions();

  const items: Kegiatan[] = (data?.items ?? []).map((p) => ({
    id: p.id, judul: p.judul, tahun: p.tahun, status: p.status,
    sumberDana: p.sumberDana, jumlahDana: p.jumlahDana,
    abstrak: p.abstrak, anggota: p.anggota,
  }));

  return (
    <KegiatanList
      title="Penelitian"
      eyebrow="TRI DHARMA · PENELITIAN"
      items={items}
      isLoading={isLoading}
      onCreate={(input) => create.mutateAsync(input)}
      onRemove={(id) => remove.mutateAsync(id)}
      onAddAnggota={(input) => addAnggota.mutateAsync(input)}
      onRemoveAnggota={(input) => removeAnggota.mutateAsync(input)}
    />
  );
}
