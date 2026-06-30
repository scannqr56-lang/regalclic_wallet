export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-rc-navy focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-rc-teal"
    >
      Aller au contenu principal
    </a>
  );
}
