/**
 * Converte áudio WebM/Opus para MP3 (audio/mpeg) no navegador.
 * Meta aceita audio/mpeg como áudio reproduzível.
 */

type Mp3EncoderCtor = new (
  channels: number,
  sampleRate: number,
  kbps: number
) => {
  encodeBuffer: (samples: Int16Array) => Int8Array | number[];
  flush: () => Int8Array | number[];
};

async function loadMp3Encoder(): Promise<Mp3EncoderCtor> {
  const mod = await import('lamejs');
  const ctor = (mod as any)?.Mp3Encoder ?? (mod as any)?.default?.Mp3Encoder;

  if (typeof ctor !== 'function') {
    throw new Error('Mp3Encoder indisponível no módulo lamejs');
  }

  return ctor as Mp3EncoderCtor;
}

export async function convertWebmToMp3(webmBlob: Blob): Promise<Blob> {
  console.log('🔄 [AudioConverter] Convertendo WebM para MP3...');
  const startTime = performance.now();

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioCtx();

  try {
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const Mp3Encoder = await loadMp3Encoder();

    const sampleRate = audioBuffer.sampleRate;
    const monoSamples = audioBuffer.getChannelData(0);

    const mp3Encoder = new Mp3Encoder(1, sampleRate, 128);
    const mp3Data: BlobPart[] = [];
    const sampleBlockSize = 1152;

    const int16Samples = new Int16Array(monoSamples.length);
    for (let i = 0; i < monoSamples.length; i++) {
      const s = Math.max(-1, Math.min(1, monoSamples[i]));
      int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    for (let i = 0; i < int16Samples.length; i += sampleBlockSize) {
      const chunk = int16Samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    }

    const end = mp3Encoder.flush();
    if (end.length > 0) {
      mp3Data.push(new Uint8Array(end));
    }

    const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
    if (mp3Blob.size < 512) {
      throw new Error('Conversão MP3 gerou arquivo inválido/vazio');
    }

    const elapsed = (performance.now() - startTime).toFixed(0);
    console.log(
      `✅ [AudioConverter] Conversão concluída em ${elapsed}ms. Tamanho: ${(mp3Blob.size / 1024).toFixed(1)}KB (original: ${(webmBlob.size / 1024).toFixed(1)}KB)`
    );

    return mp3Blob;
  } finally {
    try {
      await audioContext.close();
    } catch {
      // noop
    }
  }
}

export function needsConversion(mimeType: string): boolean {
  const clean = (mimeType || '').split(';')[0].trim().toLowerCase();
  const supported = ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'];
  return !supported.includes(clean);
}
