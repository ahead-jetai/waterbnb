import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DemoPage from '../pages/DemoPage'
import { demoSteps } from '../data/demo'

function renderDemo(path = '/demo') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/" element={<p>Back to WaterBnB</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Simulate the browser switching tabs: jsdom's `document.hidden` is read-only, so shadow it per test. */
function setTabHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  act(() => { document.dispatchEvent(new Event('visibilitychange')) })
}

describe('Demo walkthrough', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { cleanup(); vi.useRealTimers(); Reflect.deleteProperty(document, 'hidden') })

  it('runs the complete story automatically, including approval before checkout and the host payout', () => {
    renderDemo()
    expect(screen.getByRole('status')).toHaveTextContent('Ready to play')
    fireEvent.click(screen.getByRole('button', { name: 'Start demo' }))
    for (const step of demoSteps) {
      expect(screen.getByRole('heading', { name: step.title })).toBeInTheDocument()
      if (step.id === 'request') expect(screen.getByText(/no payment yet/i)).toBeInTheDocument()
      if (step.id === 'approval') expect(screen.getByText('Awaiting host approval')).toBeInTheDocument()
      if (step.id === 'confirmation') expect(screen.getByText(/reservation confirmed/i)).toBeInTheDocument()
      if (step.id === 'earnings') {
        expect(screen.getByText('Demo payout received')).toBeInTheDocument()
        // $672 guest payment - $72 service fee - $19.79 processing = $580.21.
        expect(screen.getAllByText(/\$580\.21/)).toHaveLength(2)
      }
      act(() => vi.advanceTimersByTime(6000))
    }
    expect(screen.getByRole('status')).toHaveTextContent('Demo complete')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(demoSteps.length))
    expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled()
    act(() => vi.advanceTimersByTime(60000))
    expect(screen.getByRole('status')).toHaveTextContent('Demo complete')
  })

  it('pauses, resumes at a new speed, and restarts from sign-in', () => {
    renderDemo('/demo?autoplay=1')
    expect(screen.getByRole('status')).toHaveTextContent('Playing automatically')
    fireEvent.click(screen.getByRole('button', { name: 'Pause demo' }))
    act(() => vi.advanceTimersByTime(20000))
    expect(screen.getByRole('heading', { name: demoSteps[0].title })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '3000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Resume demo' }))
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByRole('heading', { name: demoSteps[1].title })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(screen.getByRole('heading', { name: demoSteps[0].title })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Playing automatically')
  })

  it('lets the viewer perform the simulated actions manually and revisit chapters', () => {
    renderDemo()
    for (const step of demoSteps) {
      const preview = within(screen.getByRole('region', { name: 'Demo app preview' }))
      fireEvent.click(preview.getByRole('button', { name: new RegExp(step.action) }))
    }
    expect(screen.getByRole('status')).toHaveTextContent('Demo complete')
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Demo chapters' })).getByRole('button', { name: 'Create a spot' }))
    expect(screen.getByLabelText('Listing title')).toHaveValue('Blue Haven Houseboat')
    expect(screen.getByRole('status')).toHaveTextContent('Paused')
    act(() => vi.advanceTimersByTime(20000))
    expect(screen.getByRole('heading', { name: demoSteps[3].title })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByRole('heading', { name: demoSteps[2].title })).toBeInTheDocument()
  })

  it('stops playback when the viewer exits and starts fresh on a new visit', () => {
    const view = renderDemo('/demo?autoplay=1')
    act(() => vi.advanceTimersByTime(6000))
    fireEvent.click(screen.getByRole('link', { name: 'Exit demo' }))
    expect(screen.getByText('Back to WaterBnB')).toBeInTheDocument()
    expect(vi.getTimerCount()).toBe(0)
    view.unmount()
    renderDemo()
    expect(screen.getByRole('heading', { name: demoSteps[0].title })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Ready to play')
  })
  it('pauses automatic playback when the tab is hidden and leaves a demo that is not playing alone', () => {
    renderDemo()
    // Hiding the tab before the demo starts must not turn "Start demo" into "Resume demo".
    setTabHidden(true)
    expect(screen.getByRole('status')).toHaveTextContent('Ready to play')
    expect(screen.getByRole('button', { name: 'Start demo' })).toBeInTheDocument()

    setTabHidden(false)
    fireEvent.click(screen.getByRole('button', { name: 'Start demo' }))
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByRole('heading', { name: demoSteps[1].title })).toBeInTheDocument()

    setTabHidden(true)
    expect(screen.getByRole('status')).toHaveTextContent('Paused')
    act(() => vi.advanceTimersByTime(60000))
    expect(screen.getByRole('heading', { name: demoSteps[1].title })).toBeInTheDocument()

    // Returning to the tab leaves the choice to continue with the viewer.
    setTabHidden(false)
    expect(screen.getByRole('status')).toHaveTextContent('Paused')
    fireEvent.click(screen.getByRole('button', { name: 'Resume demo' }))
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByRole('heading', { name: demoSteps[2].title })).toBeInTheDocument()
  })
})
