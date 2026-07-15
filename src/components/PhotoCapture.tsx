'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('plant-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
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
        <img src={preview} alt="Vista previa" className="h-48 w-48 rounded-xl object-cover shadow" />
      ) : (
        <div className="flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-leaf-300 bg-leaf-50 text-4xl">
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

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="rounded-full bg-leaf-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-leaf-700 disabled:opacity-50"
      >
        {uploading ? 'Subiendo foto...' : preview ? 'Cambiar foto' : label}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
