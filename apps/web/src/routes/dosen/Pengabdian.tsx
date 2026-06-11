import { useDosenPengabdian, usePengabdianActions } from '@/lib/queries-dosen';
import { KegiatanList, type Kegiatan } from '@/components/KegiatanForm';

export function DosenPengabdian() {
  const { data, isLoading } = useDosenPengabdian();
  const { create, remove, addAnggota, removeAnggota } = usePengabdianActions();

  const items: Kegiatan[] = (data?.items ?? []).map((p) => ({
    id: p.id, judul: p.judul, tahun: p.tahun, status: p.status,
    sumberDana: p.sumberDana, jumlahDana: p.jumlahDana,
    deskripsi: p.deskripsi, lokasi: p.lokasi, anggota: p.anggota,
  }));

  return (
    <KegiatanList
      title="Pengabdian Masyarakat"
      eyebrow="TRI DHARMA · PENGABDIAN"
      items={items}
      isLoading={isLoading}
      isPengabdian
      onCreate={(input) => create.mutateAsync(input)}
      onRemove={(id) => remove.mutateAsync(id)}
      onAddAnggota={(input) => addAnggota.mutateAsync(input)}
      onRemoveAnggota={(input) => removeAnggota.mutateAsync(input)}
    />
  );
}
