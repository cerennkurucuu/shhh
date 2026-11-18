import { releaseAudio, revokeQuietly } from './media-duration-probe';

describe('media metadata resource cleanup', () => {
  it('tolerates releasing the same audio element more than once', () => {
    const audio = {
      removeAttribute: vi.fn(),
      load: vi.fn(),
    } as unknown as HTMLAudioElement;

    expect(() => {
      releaseAudio(audio);
      releaseAudio(audio);
    }).not.toThrow();
    expect(audio.removeAttribute).toHaveBeenCalledTimes(2);
    expect(audio.load).toHaveBeenCalledTimes(2);
  });

  it('tolerates repeated revoke attempts and a browser revoke error', () => {
    const original = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    const revoke = vi.fn(() => {
      throw new Error('already revoked');
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revoke,
    });

    try {
      expect(() => {
        revokeQuietly('blob:repeat-test');
        revokeQuietly('blob:repeat-test');
      }).not.toThrow();
      expect(revoke).toHaveBeenCalledTimes(2);
    } finally {
      if (original) {
        Object.defineProperty(URL, 'revokeObjectURL', original);
      } else {
        Reflect.deleteProperty(URL, 'revokeObjectURL');
      }
    }
  });
});
