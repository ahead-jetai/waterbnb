export default function Footer() {
  const year = new Date().getFullYear()
  const links = [
    { href: '#about', label: 'About' },
    { href: '#careers', label: 'Careers' },
    { href: '#help', label: 'Help' },
    { href: '#terms', label: 'Terms' },
    { href: '#privacy', label: 'Privacy' },
    { href: '#contact', label: 'Contact' },
  ]
  return (
    <footer className="mt-16 bg-muted text-white/80">
      <div className="container-p py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 14c.83.64 2.58 2 4.5 2s3.67-1.36 4.5-2c.83-.64 2.58-2 4.5-2s3.67 1.36 4.5 2" />
                <path d="M3 9c.83.64 2.58 2 4.5 2s3.67-1.36 4.5-2c.83-.64 2.58-2 4.5-2s3.67 1.36 4.5 2" />
              </svg>
            </span>
            <span className="font-display font-semibold text-xl tracking-tight text-white">WaterBnB</span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs">
            Boat-based stays across the world. Find your next adventure on the water.
          </p>
        </div>
        <nav aria-label="Footer" className="sm:justify-self-end lg:justify-self-center">
          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            {links.map((l) => (
              <li key={l.label}>
                <a className="text-white/60 hover:text-white no-underline transition-colors duration-150" href={l.href}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-white/40 lg:justify-self-end self-end">
          © {year} WaterBnB. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
