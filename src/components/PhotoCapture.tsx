'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/imageCompress';

interface PhotoCaptureProps {
  onUploaded: (url: string) => void;
  label?: string;
}

export function PhotoCapture({ onUploaded, label = 'Hacer foto' }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      setPreview(URL.createObjectURL(compressed));

      const supabase = createClient();
      const path = `${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('plant-photos').upload(path, compressed, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('plant-photos').getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {preview ? (
        <img src={preview} alt="Vista previa" className="h-48 w-48 rounded-2xl object-cover shadow-soft" />
      ) : (
        <div className="flex h-48 w-48 items-center justify-center rounded-2xl border-2 border-dashed border-leaf-200 bg-leaf-50 text-4xl">
          🌿
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-primary">
        {uploading ? 'Preparando foto...' : preview ? '📷 Cambiar foto' : `📷 ${label}`}
      </button>

      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
