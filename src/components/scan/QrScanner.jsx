import { Scanner } from '@yudiel/react-qr-scanner';

/**
 * Scanner caméra pour les QR codes des cartes fidélité.
 */
export default function QrScanner({ active, onResult, onError }) {
  if (!active) {
    return (
      <div className="flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-xl bg-slate-100 px-4 text-center text-sm text-slate-500 sm:aspect-square sm:max-h-[min(70vh,28rem)]">
        <p>Activez le scanner pour démarrer la caméra.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-center">
      <div className="aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-black sm:aspect-square sm:max-h-[min(70vh,28rem)]">
        <Scanner
          onScan={(codes) => {
            if (!codes?.length) return;
            const first = codes[0];
            const value = first?.rawValue || first;
            if (typeof value === 'string' && value.trim()) {
              onResult?.(value.trim());
            }
          }}
          onError={(error) => {
            if (error) onError?.(error);
          }}
          constraints={{ facingMode: 'environment' }}
          styles={{
            container: { width: '100%' },
            video: { width: '100%', objectFit: 'cover' },
          }}
        />
      </div>
    </div>
  );
}
