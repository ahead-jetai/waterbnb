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
    <footer className="mt-16 border-t border-black/5 bg-white">
      <div className="container-p py-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white font-bold">W</span>
            <span className="font-semibold text-lg tracking-tight text-muted">WaterBnB</span>
          </div>
          <p className="text-sm text-slate-600">Boat-based stays across the world. Find your next adventure on the water.</p>
        </div>
        <nav aria-label="Footer" className="sm:justify-self-end lg:justify-self-center">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {links.map((l) => (
              <li key={l.label}><a className="hover:text-brand" href={l.href}>{l.label}</a></li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-slate-500 lg:justify-self-end">© {year} WaterBnB. All rights reserved.</p>
      </div>
    </footer>
  )
}
