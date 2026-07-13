import { useState } from 'react'
import { Link } from 'react-router-dom'

const STATS = [
  { value: '$2,400', label: 'Avg. monthly earnings' },
  { value: '3,000+', label: 'Active hosts' },
  { value: '200+', label: 'Destinations' },
  { value: '4.9★', label: 'Host rating' },
]

const STEPS = [
  {
    number: '01',
    title: 'List in minutes',
    desc: 'Create your listing with photos, amenities, and pricing. Our tools make it simple to go live fast.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Welcome guests',
    desc: 'Review booking requests, message guests, and manage your calendar all from one place.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Earn consistently',
    desc: 'Receive payouts directly to your bank account after every stay. No chasing invoices.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
]

const BENEFITS = [
  {
    title: 'Host Protection',
    desc: 'Up to $50,000 in damage protection included with every booking, at no cost to you.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: 'Verified Guests',
    desc: 'Every guest completes ID verification before they can book. Your safety comes first.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: '24/7 Support',
    desc: 'Dedicated host support available around the clock. Whenever you need us, we\'re here.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5 19.79 19.79 0 01.14 1a2 2 0 012-2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 6.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 13.92z" />
      </svg>
    ),
  },
  {
    title: 'Smart Pricing',
    desc: 'AI-powered pricing tools analyse local demand so you never leave money on the table.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
]

const TESTIMONIALS = [
  {
    quote: 'I was sceptical at first, but WaterBnB has completely transformed my income. My sailboat now earns over $3,200 a month during peak season — more than I ever thought possible.',
    name: 'Sophia R.',
    role: 'Sailboat host · Dubrovnik, Croatia',
    initials: 'SR',
    color: 'bg-accent',
  },
  {
    quote: 'The onboarding process was surprisingly smooth. Within a week of listing, I had my first booking. The support team answered every question I had within minutes.',
    name: 'Marco T.',
    role: 'Yacht host · Amalfi, Italy',
    initials: 'MT',
    color: 'bg-brand',
  },
]

export default function HostLandingPage() {
  const [pricePerNight, setPricePerNight] = useState(200)
  const [nightsPerMonth, setNightsPerMonth] = useState(10)

  const monthlyGross = pricePerNight * nightsPerMonth
  const monthlyNet = Math.round(monthlyGross * 0.88)
  const annualNet = monthlyNet * 12

  return (
    <main>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-muted" aria-label="Host hero">
        <div className="absolute inset-0 -z-10">
          <img
            src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1600&q=60"
            alt="Catamaran at sunset"
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/80 to-transparent" />
        </div>

        <div className="container-p py-24 lg:py-36">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="font-display italic text-brand-light text-lg mb-5 animate-fade-in">
                WaterBnB for Hosts
              </p>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-medium text-white leading-[1.05] tracking-tight animate-fade-up">
                Your boat.<br />
                <em className="italic text-brand-light">Their adventure.</em><br />
                Your income.
              </h1>
              <p className="mt-6 text-white/70 text-lg font-light leading-relaxed max-w-md [animation-delay:0.15s] animate-fade-up">
                Join thousands of boat owners earning an average of $2,400 per month. List for free — we only earn when you do.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 [animation-delay:0.3s] animate-fade-up">
                <Link to="/host/list" className="btn btn-primary no-underline text-base px-6 py-3">
                  List your boat — it's free
                </Link>
                <a href="#how-it-works" className="btn btn-secondary no-underline text-base px-6 py-3">
                  How it works
                </a>
              </div>
            </div>

            {/* Floating earnings card */}
            <div className="[animation-delay:0.4s] animate-fade-up">
              <div className="card p-8 max-w-sm mx-auto lg:mx-0 lg:ml-auto">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Average WaterBnB host</p>
                <div className="font-display text-5xl font-medium text-brand mt-2">$2,400</div>
                <p className="text-slate-500 text-sm mt-1">per month</p>
                <div className="mt-5 pt-5 border-t border-slate-100 space-y-2.5">
                  {[
                    { label: 'Sailboats & yachts', value: '$1,800–$4,200' },
                    { label: 'Houseboats', value: '$1,200–$2,800' },
                    { label: 'Catamarans', value: '$2,600–$6,000' },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between text-sm">
                      <span className="text-slate-500">{row.label}</span>
                      <span className="font-medium text-slate-800">{row.value}</span>
                    </div>
                  ))}
                </div>
                <Link to="/host/list" className="btn btn-primary w-full mt-6 no-underline">
                  Start listing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="bg-brand">
        <div className="container-p py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-white">
          {STATS.map(s => (
            <div key={s.label}>
              <div className="font-display text-2xl font-medium">{s.value}</div>
              <div className="text-xs text-white/70 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Earnings calculator ── */}
      <section className="bg-white py-20" aria-labelledby="calc-heading">
        <div className="container-p max-w-5xl">
          <div className="text-center mb-12">
            <h2 id="calc-heading" className="font-display text-4xl sm:text-5xl font-medium text-muted">
              How much could you earn?
            </h2>
            <p className="text-slate-500 mt-2">Adjust the sliders — see your potential in real time.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-8">
              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <label className="text-sm font-medium text-slate-700">Your price per night</label>
                  <span className="font-display text-2xl font-medium text-muted">${pricePerNight}</span>
                </div>
                <input
                  type="range"
                  min={50} max={1500} step={10}
                  value={pricePerNight}
                  onChange={e => setPricePerNight(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-brand bg-slate-200"
                  aria-label="Price per night"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                  <span>$50</span><span>$1,500</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <label className="text-sm font-medium text-slate-700">Nights hosted per month</label>
                  <span className="font-display text-2xl font-medium text-muted">{nightsPerMonth}</span>
                </div>
                <input
                  type="range"
                  min={1} max={30} step={1}
                  value={nightsPerMonth}
                  onChange={e => setNightsPerMonth(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-brand bg-slate-200"
                  aria-label="Nights per month"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                  <span>1 night</span><span>30 nights</span>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Estimates are illustrative. Actual earnings vary by location, season, and listing quality. WaterBnB charges hosts a 12% service fee.
              </p>
            </div>

            <div className="card p-8 text-center bg-background">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Your estimated earnings</p>
              <div className="font-display text-6xl font-medium text-brand transition-all duration-200">
                ${monthlyNet.toLocaleString()}
              </div>
              <p className="text-slate-500 text-sm mt-1">per month (after fees)</p>

              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm">
                <div className="text-left">
                  <p className="text-xs text-slate-400">Gross/month</p>
                  <p className="font-semibold text-slate-700 mt-0.5">${monthlyGross.toLocaleString()}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-400">Estimated/year</p>
                  <p className="font-semibold text-slate-700 mt-0.5">${annualNet.toLocaleString()}</p>
                </div>
              </div>

              <Link to="/host/list" className="btn btn-primary w-full mt-6 no-underline">
                Start earning
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="bg-background py-20" aria-labelledby="hiw-heading">
        <div className="container-p">
          <div className="text-center mb-14">
            <h2 id="hiw-heading" className="font-display text-4xl sm:text-5xl font-medium text-muted">How it works</h2>
            <p className="text-slate-500 mt-2">Up and running in three simple steps.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map(step => (
              <div key={step.number} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 text-brand mb-5">
                  {step.icon}
                </div>
                <div className="font-display text-4xl font-medium text-slate-100 mb-1 leading-none">{step.number}</div>
                <h3 className="font-semibold text-lg text-slate-900 mt-1 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="bg-muted py-20" aria-labelledby="benefits-heading">
        <div className="container-p">
          <div className="text-center mb-14">
            <h2 id="benefits-heading" className="font-display text-4xl sm:text-5xl font-medium text-white">
              Why host on WaterBnB
            </h2>
            <p className="text-white/60 mt-2">Everything you need to host with confidence.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map(b => (
              <div key={b.title} className="bg-white/5 hover:bg-white/10 transition-colors duration-200 rounded-xl p-6 ring-1 ring-white/10">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand/20 text-brand-light mb-4">
                  {b.icon}
                </div>
                <h3 className="font-semibold text-white mb-2">{b.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-white py-20" aria-labelledby="testimonials-heading">
        <div className="container-p max-w-5xl">
          <div className="text-center mb-12">
            <h2 id="testimonials-heading" className="font-display text-4xl sm:text-5xl font-medium text-muted">
              Hosts love WaterBnB
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {TESTIMONIALS.map(t => (
              <blockquote key={t.name} className="card p-8">
                <div className="flex mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="font-display text-xl font-medium text-slate-800 leading-snug italic mb-6">
                  "{t.quote}"
                </p>
                <footer className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${t.color} text-white flex items-center justify-center text-sm font-semibold flex-shrink-0`}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-brand py-20 text-white text-center" aria-labelledby="cta-heading">
        <div className="container-p max-w-2xl">
          <h2 id="cta-heading" className="font-display text-5xl sm:text-6xl font-medium leading-tight">
            Ready to set sail?
          </h2>
          <p className="mt-4 text-white/75 text-lg font-light">
            List your boat today. It's free to get started, and takes less than 10 minutes.
          </p>
          <Link to="/host/list" className="btn bg-white text-brand hover:bg-white/90 no-underline mt-8 text-base px-8 py-3 inline-flex">
            Start your listing
          </Link>
        </div>
      </section>
    </main>
  )
}
