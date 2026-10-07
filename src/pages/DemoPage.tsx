import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import DemoScene from '../components/demo/DemoScene'
import { demoSteps } from '../data/demo'

type Playback = 'ready' | 'playing' | 'paused' | 'complete'

/** A self-contained walkthrough: no auth hooks, service calls, or persisted data. */
export default function DemoPage() {
  const { search } = useLocation()
  const [index, setIndex] = useState(0)
  const [playback, setPlayback] = useState<Playback>(() => new URLSearchParams(search).get('autoplay') === '1' ? 'playing' : 'ready')
  const [duration, setDuration] = useState(6000)
  const step = demoSteps[index]
  const complete = playback === 'complete'

  useEffect(() => {
    if (playback !== 'playing') return
    const timer = window.setTimeout(() => {
      if (index === demoSteps.length - 1) setPlayback('complete')
      else setIndex(index + 1)
    }, duration)
    return () => window.clearTimeout(timer)
  }, [playback, index, duration])

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) setPlayback(current => current === 'playing' ? 'paused' : current)
    }
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden)
  }, [])

  const replay = () => { setIndex(0); setPlayback('playing') }
  const goTo = (next: number) => { setIndex(next); setPlayback('paused') }
  const advance = () => {
    if (index === demoSteps.length - 1) setPlayback('complete')
    else goTo(index + 1)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-brand/10 bg-white">
        <div className="container-p flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-3"><span className="font-display text-2xl font-semibold text-muted">WaterBnB</span><span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">Demo mode</span></div>
          <Link to="/" className="btn btn-secondary text-sm no-underline">Exit demo</Link>
        </div>
      </header>

      <main className="container-p py-8 sm:py-12">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-brand">A stay, from start to finish</p>
          <h1 className="mt-2 font-display text-4xl font-medium text-muted sm:text-5xl">See life on WaterBnB.</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">Follow Maya’s first listing and Alex’s first booking, all the way to the host’s payout. Everything here is fictional; no real accounts, listings, bookings, or charges are created.</p>
        </div>

        <section aria-label="Demo playback" className="my-7 rounded-xl border border-brand/10 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={playback === 'playing' ? () => setPlayback('paused') : complete || playback === 'ready' ? replay : () => setPlayback('playing')} className="btn btn-primary min-w-32">
              {playback === 'playing' ? 'Pause demo' : complete ? 'Replay demo' : playback === 'ready' ? 'Start demo' : 'Resume demo'}
            </button>
            <button onClick={() => goTo(index - 1)} disabled={index === 0} className="btn btn-secondary disabled:opacity-40">Previous</button>
            <button onClick={advance} disabled={complete} className="btn btn-secondary disabled:opacity-40">{index === demoSteps.length - 1 ? 'Finish' : 'Next'}</button>
            {playback !== 'ready' && <button onClick={replay} className="px-2 py-2 text-sm font-medium text-brand">Restart</button>}
            <label className="flex items-center gap-2 text-sm text-slate-600 sm:ml-auto">Playback speed
              <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <option value={10000}>Slow</option><option value={6000}>Normal</option><option value={3000}>Fast</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
            <span role="status">{complete ? 'Demo complete' : `Step ${index + 1} of ${demoSteps.length} · ${playback === 'playing' ? 'Playing automatically' : playback === 'ready' ? 'Ready to play' : 'Paused'}`}</span>
            <span>About one minute · pause or explore any step</span>
          </div>
          <div role="progressbar" aria-label="Demo progress" aria-valuemin={0} aria-valuemax={demoSteps.length} aria-valuenow={complete ? demoSteps.length : index} aria-valuetext={complete ? 'Complete' : `Step ${index + 1}: ${step.label}`} className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand motion-safe:transition-all" style={{ width: `${(complete ? demoSteps.length : index) / demoSteps.length * 100}%` }} />
          </div>
        </section>

        <div className="grid items-start gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Demo chapters" className="min-w-0 rounded-xl bg-white p-3 ring-1 ring-black/5">
            <ol className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
              {demoSteps.map((chapter, i) => (
                <li key={chapter.id} className="shrink-0 lg:shrink">
                  <button onClick={() => goTo(i)} aria-current={index === i ? 'step' : undefined} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${index === i ? 'bg-brand/10 font-semibold text-brand' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${i < index || complete ? 'bg-accent/10 text-accent-dark' : 'bg-slate-100'}`} aria-hidden="true">{i < index || complete ? '✓' : i + 1}</span>{chapter.label}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0">
            <div aria-live="polite" aria-atomic="true" className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">{step.actor === 'host' ? 'Maya’s host journey' : 'Alex’s guest journey'}</p>
              <h2 className="mt-2 font-display text-3xl font-medium text-muted">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </div>
            <DemoScene step={step} onAdvance={advance} complete={complete} />
            {complete && <div className="mt-5 rounded-xl bg-accent/10 p-5 text-sm text-muted"><p className="font-semibold">One spot. One happy guest. One paid host.</p><p className="mt-1">You’ve seen the full journey. Replay it, revisit a chapter, or exit to explore WaterBnB.</p></div>}
          </div>
        </div>
      </main>
    </div>
  )
}
