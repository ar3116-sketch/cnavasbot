import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, BookOpen, CalendarDays, Check,
  ChevronLeft, ChevronRight, CircleGauge, Clock3, Cloud, GraduationCap,
  LayoutDashboard, ListTodo, LockKeyhole, Menu, Moon, Play, Plus, RefreshCw,
  Settings, Sparkles, Sun, Target, X,
} from 'lucide-react'
import { addDays, differenceInMinutes, format, isSameDay, startOfWeek } from 'date-fns'
import './App.css'
import './App.extra.css'

type AssignmentState = 'AWAITING_CALIBRATION' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'
type Risk = 'LOW' | 'MEDIUM' | 'HIGH'
type Course = { id: number; name: string; code: string; color: string }
type Assignment = {
  id: number; title: string; description: string; due_at: string; state: AssignmentState
  base_minutes: number; estimated_minutes: number; scheduled_minutes: number
  proficiency: string | null; risk: Risk; assignment_type: string; course: Course
}
type CalendarItem = {
  id: string; title: string; start_at: string; end_at: string; kind: 'HARD' | 'PROTECTED' | 'FLOATING'
  color: string; locked: boolean; assignment_id?: number
}
type DashboardData = {
  assignments: Assignment[]; events: CalendarItem[]; calibration_count: number
  high_risk_count: number; scheduled_minutes: number
}
type NavItem = 'Today' | 'Calendar' | 'Assignments' | 'Mastery' | 'Settings'

const API = 'http://localhost:8000/api/v1'

const localDate = (offset: number, hour: number, minute = 0) => {
  const date = addDays(new Date(), offset)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

const courses: Course[] = [
  { id: 1, name: 'Engineering Mechanics: Statics', code: 'ME 201', color: '#496458' },
  { id: 2, name: 'Differential Equations', code: 'MATH 241', color: '#b06242' },
  { id: 3, name: 'Intro to Engineering', code: 'ENGR 101', color: '#586e8c' },
]

const demoAssignments: Assignment[] = [
  { id: 1, title: 'Truss Analysis Set', description: 'Method of joints and sections', due_at: localDate(2, 23, 59), state: 'SCHEDULED', base_minutes: 150, estimated_minutes: 180, scheduled_minutes: 180, proficiency: 'MEDIUM', risk: 'MEDIUM', assignment_type: 'Homework', course: courses[0] },
  { id: 4, title: 'Friction Quiz', description: 'Static and kinetic friction', due_at: localDate(1, 11), state: 'AWAITING_CALIBRATION', base_minutes: 60, estimated_minutes: 60, scheduled_minutes: 0, proficiency: null, risk: 'HIGH', assignment_type: 'Quiz', course: courses[0] },
  { id: 2, title: 'Laplace Transform Problems', description: 'Solve IVPs with Laplace transforms', due_at: localDate(4, 17), state: 'AWAITING_CALIBRATION', base_minutes: 120, estimated_minutes: 120, scheduled_minutes: 0, proficiency: null, risk: 'LOW', assignment_type: 'Problem set', course: courses[1] },
  { id: 3, title: 'Design Memo — Prototype Review', description: 'Two-page design review memo', due_at: localDate(6, 12), state: 'SCHEDULED', base_minutes: 90, estimated_minutes: 90, scheduled_minutes: 90, proficiency: 'HIGH', risk: 'LOW', assignment_type: 'Writing', course: courses[2] },
]

const demoEvents: CalendarItem[] = [
  { id: 'event-1', title: 'Differential Equations', start_at: localDate(0, 9), end_at: localDate(0, 9, 50), kind: 'HARD', color: '#586e8c', locked: true },
  { id: 'event-2', title: 'Engineering Mechanics', start_at: localDate(0, 11), end_at: localDate(0, 12, 15), kind: 'HARD', color: '#496458', locked: true },
  { id: 'event-3', title: 'Lunch', start_at: localDate(0, 12, 30), end_at: localDate(0, 13, 15), kind: 'PROTECTED', color: '#a99c81', locked: true },
  { id: 'block-1', title: 'Truss Analysis Set', start_at: localDate(0, 15), end_at: localDate(0, 16, 30), kind: 'FLOATING', color: '#d7784a', locked: false, assignment_id: 1 },
  { id: 'event-4', title: 'Gym', start_at: localDate(0, 18), end_at: localDate(0, 19), kind: 'PROTECTED', color: '#a99c81', locked: true },
  { id: 'event-5', title: 'Differential Equations', start_at: localDate(1, 9), end_at: localDate(1, 9, 50), kind: 'HARD', color: '#586e8c', locked: true },
  { id: 'block-2', title: 'Truss Analysis Set', start_at: localDate(1, 14), end_at: localDate(1, 15, 30), kind: 'FLOATING', color: '#d7784a', locked: false, assignment_id: 1 },
  { id: 'event-6', title: 'Engineering Lab', start_at: localDate(2, 13), end_at: localDate(2, 15), kind: 'HARD', color: '#496458', locked: true },
  { id: 'block-3', title: 'Design Memo', start_at: localDate(3, 16), end_at: localDate(3, 17, 30), kind: 'FLOATING', color: '#d7784a', locked: false, assignment_id: 3 },
]

const demoData: DashboardData = { assignments: demoAssignments, events: demoEvents, calibration_count: 2, high_risk_count: 1, scheduled_minutes: 270 }

const minutesLabel = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes}m`
const stateLabel = (state: string) => state.toLowerCase().replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())

function Sidebar({ active, onChange, mobileOpen, onClose }: { active: NavItem; onChange: (item: NavItem) => void; mobileOpen: boolean; onClose: () => void }) {
  const nav: [NavItem, typeof LayoutDashboard][] = [['Today', LayoutDashboard], ['Calendar', CalendarDays], ['Assignments', ListTodo], ['Mastery', BarChart3], ['Settings', Settings]]
  return <>
    {mobileOpen && <button className="scrim" aria-label="Close navigation" onClick={onClose} />}
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={20} /></div><div><strong>Cadence</strong><span>Academic planner</span></div></div>
      <nav>{nav.map(([label, Icon]) => <button key={label} className={active === label ? 'active' : ''} onClick={() => { onChange(label); onClose() }}><Icon size={18} /><span>{label}</span>{label === 'Assignments' && <em>4</em>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="sync-card"><div className="sync-icon"><Cloud size={16} /></div><div><strong>Demo workspace</strong><span>Live services disconnected</span></div><span className="status-dot" /></div>
        <div className="profile"><div className="avatar">AS</div><div><strong>Alex Student</strong><span>Fall semester</span></div><button aria-label="Open settings"><Settings size={16} /></button></div>
      </div>
    </aside>
  </>
}

function Header({ active, onMenu, theme, setTheme, onSync, syncing }: { active: NavItem; onMenu: () => void; theme: string; setTheme: (v: string) => void; onSync: () => void; syncing: boolean }) {
  return <header><div className="header-title"><button className="mobile-menu" onClick={onMenu} aria-label="Open navigation"><Menu size={20} /></button><div><p>{format(new Date(), 'EEEE, MMMM d')}</p><h1>{active === 'Today' ? 'Your academic command center' : active}</h1></div></div><div className="header-actions"><button className="icon-button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button notification" aria-label="Notifications"><Bell size={18} /><span /></button><button className="sync-button" onClick={onSync} disabled={syncing}><RefreshCw size={16} className={syncing ? 'spin' : ''} />{syncing ? 'Syncing…' : 'Sync Canvas'}</button></div></header>
}

function StatStrip({ data }: { data: DashboardData }) {
  const [renderedAt] = useState(() => Date.now())
  const dueSoon = data.assignments.filter(a => new Date(a.due_at).getTime() - renderedAt < 3 * 86400000).length
  return <section className="stat-strip">
    <div><span className="stat-icon sage"><Clock3 size={18} /></span><p><strong>{minutesLabel(data.scheduled_minutes)}</strong><small>Scheduled this week</small></p><em>on track</em></div>
    <div><span className="stat-icon blue"><ListTodo size={18} /></span><p><strong>{dueSoon}</strong><small>Due in 72 hours</small></p><em className="neutral">stay focused</em></div>
    <div><span className="stat-icon amber"><Target size={18} /></span><p><strong>{data.calibration_count}</strong><small>Need calibration</small></p><em className="attention">action needed</em></div>
    <div><span className="stat-icon coral"><AlertTriangle size={18} /></span><p><strong>{data.high_risk_count}</strong><small>Deadline at risk</small></p><em className="risk">review now</em></div>
  </section>
}

function TodayTimeline({ events }: { events: CalendarItem[] }) {
  const today = events.filter(e => isSameDay(new Date(e.start_at), new Date())).sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
  return <section className="panel today-panel"><div className="panel-heading"><div><span className="eyebrow">TODAY’S RHYTHM</span><h2>Focus timeline</h2></div><button className="text-button">Open day <ArrowRight size={15} /></button></div>
    <div className="timeline">{today.map((event, index) => <div className="timeline-row" key={event.id}><time>{format(new Date(event.start_at), 'h:mm')}<small>{format(new Date(event.start_at), 'a')}</small></time><div className="timeline-line"><span style={{ background: event.color }} />{index < today.length - 1 && <i />}</div><article className={`timeline-event ${event.kind.toLowerCase()}`} style={{ '--event-color': event.color } as React.CSSProperties}><div><strong>{event.title}</strong><span>{event.kind === 'FLOATING' ? 'AI-planned focus block' : event.kind === 'PROTECTED' ? 'Protected time' : 'Calendar event'}</span></div><div className="event-meta"><span>{differenceInMinutes(new Date(event.end_at), new Date(event.start_at))} min</span>{event.locked ? <LockKeyhole size={13} /> : <Sparkles size={13} />}</div></article></div>)}</div>
  </section>
}

function WeekCalendar({ events, weekOffset, setWeekOffset }: { events: CalendarItem[]; weekOffset: number; setWeekOffset: (n: number) => void }) {
  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  return <section className="panel calendar-panel"><div className="panel-heading calendar-heading"><div><span className="eyebrow">WEEK PLAN</span><h2>{format(weekStart, 'MMMM yyyy')}</h2></div><div className="week-controls"><button onClick={() => setWeekOffset(weekOffset - 1)} aria-label="Previous week"><ChevronLeft size={17} /></button><button onClick={() => setWeekOffset(0)}>Today</button><button onClick={() => setWeekOffset(weekOffset + 1)} aria-label="Next week"><ChevronRight size={17} /></button></div></div>
    <div className="calendar-scroll"><div className="week-grid"><div className="time-header" />{days.map(day => <div className={`day-header ${isSameDay(day, new Date()) ? 'current' : ''}`} key={day.toISOString()}><span>{format(day, 'EEE').toUpperCase()}</span><strong>{format(day, 'd')}</strong></div>)}
      {hours.map(hour => <div className="week-row" key={hour} style={{ gridColumn: '1 / -1' }}><time>{format(new Date(2020, 1, 1, hour), 'ha')}</time>{days.map(day => <div className="day-cell" key={day.toISOString()}>{events.filter(event => isSameDay(new Date(event.start_at), day) && new Date(event.start_at).getHours() === hour).map(event => <button title={event.title} key={event.id} className={`calendar-event ${event.kind.toLowerCase()}`} style={{ '--event-color': event.color } as React.CSSProperties}><strong>{event.title}</strong><span>{format(new Date(event.start_at), 'h:mm')}–{format(new Date(event.end_at), 'h:mm')}</span></button>)}</div>)}</div>)}
    </div></div>
    <div className="calendar-legend"><span><i className="hard-dot" />Fixed</span><span><i className="floating-dot" />Adaptive study</span><span><i className="protected-dot" />Protected</span></div>
  </section>
}

function AssignmentQueue({ assignments, onCalibrate }: { assignments: Assignment[]; onCalibrate: (a: Assignment) => void }) {
  return <section className="panel assignment-panel"><div className="panel-heading"><div><span className="eyebrow">NEXT UP</span><h2>Assignment queue</h2></div><button className="text-button">View all <ArrowRight size={15} /></button></div><div className="assignment-list">{assignments.map(a => <article className="assignment-row" key={a.id}><span className="course-line" style={{ background: a.course.color }} /><div className="assignment-main"><span className="course-code">{a.course.code}</span><strong>{a.title}</strong><small>Due {format(new Date(a.due_at), 'EEE, MMM d · h:mm a')}</small></div><div className="assignment-duration"><strong>{minutesLabel(a.estimated_minutes)}</strong><small>{a.scheduled_minutes ? `${minutesLabel(a.scheduled_minutes)} planned` : 'Not scheduled'}</small></div><div className="assignment-status">{a.state === 'AWAITING_CALIBRATION' ? <button className="calibrate" onClick={() => onCalibrate(a)}><Play size={12} fill="currentColor" /> Calibrate</button> : <span className={`risk-pill ${a.risk.toLowerCase()}`}>{a.risk === 'LOW' ? <Check size={12} /> : <CircleGauge size={12} />}{a.risk.toLowerCase()} risk</span>}</div></article>)}</div></section>
}

function FocusCard({ assignment }: { assignment: Assignment | undefined }) {
  if (!assignment) return null
  const percent = Math.min(100, Math.round((assignment.scheduled_minutes / assignment.estimated_minutes) * 100))
  return <aside className="focus-card"><span className="eyebrow">FOCUS SIGNAL</span><div className="focus-title"><div><small>{assignment.course.code}</small><h3>{assignment.title}</h3></div><span>{assignment.risk}</span></div><div className="ring-wrap"><div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` } as React.CSSProperties}><div><strong>{percent}%</strong><span>planned</span></div></div><p><strong>{minutesLabel(assignment.scheduled_minutes)}</strong> of {minutesLabel(assignment.estimated_minutes)} placed before the safety buffer.</p></div><div className="focus-note"><Sparkles size={16} /><p><strong>Why this plan?</strong><span>Your medium mastery in truss methods adds 30 minutes and splits work across two afternoons.</span></p></div><button className="primary-button">Review schedule <ArrowRight size={15} /></button></aside>
}

function AssignmentsView({ assignments, onCalibrate }: { assignments: Assignment[]; onCalibrate: (a: Assignment) => void }) {
  return <div className="full-view"><div className="view-intro"><div><span className="eyebrow">WORKLOAD</span><h2>Every deadline, one clear plan.</h2><p>Calibration gates final scheduling so estimates reflect what you actually know.</p></div><button className="primary-button"><Plus size={16} /> Add assignment</button></div><div className="assignment-table"><div className="table-head"><span>Assignment</span><span>Due</span><span>Estimate</span><span>State</span><span>Risk</span></div>{assignments.map(a => <div className="table-row" key={a.id}><div className="table-assignment"><i style={{ background: a.course.color }} /><div><strong>{a.title}</strong><small>{a.course.code} · {a.assignment_type}</small></div></div><span>{format(new Date(a.due_at), 'MMM d, h:mm a')}</span><span>{minutesLabel(a.estimated_minutes)}</span><span className="state-text">{stateLabel(a.state)}</span><span>{a.state === 'AWAITING_CALIBRATION' ? <button className="calibrate" onClick={() => onCalibrate(a)}>Calibrate</button> : <span className={`risk-pill ${a.risk.toLowerCase()}`}>{a.risk}</span>}</span></div>)}</div></div>
}

function MasteryView() {
  const rows = [{ course: 'Engineering Mechanics: Statics', topic: 'Equilibrium', score: 91, evidence: 9 }, { course: 'Engineering Mechanics: Statics', topic: 'Method of Joints', score: 84, evidence: 7 }, { course: 'Engineering Mechanics: Statics', topic: 'Method of Sections', score: 57, evidence: 4 }, { course: 'Differential Equations', topic: 'Laplace Transforms', score: 68, evidence: 3 }]
  return <div className="full-view"><div className="view-intro"><div><span className="eyebrow">MASTERY MAP</span><h2>Knowledge, measured with restraint.</h2><p>Scores move gradually as evidence accumulates—not on a model’s hunch.</p></div></div><div className="mastery-layout"><section className="panel mastery-card"><h3>{rows[0].course}</h3>{rows.slice(0, 3).map(r => <div className="mastery-row" key={r.topic}><div><strong>{r.topic}</strong><small>{r.evidence} observations</small></div><div className="mastery-bar"><i style={{ width: `${r.score}%` }} /></div><b>{r.score}%</b></div>)}</section><section className="panel mastery-card"><h3>{rows[3].course}</h3>{rows.slice(3).map(r => <div className="mastery-row" key={r.topic}><div><strong>{r.topic}</strong><small>{r.evidence} observations</small></div><div className="mastery-bar"><i style={{ width: `${r.score}%` }} /></div><b>{r.score}%</b></div>)}<div className="mastery-callout"><Target size={20} /><p><strong>Next calibration opportunity</strong><span>Laplace Transform Problems can raise confidence from 48%.</span></p></div></section></div></div>
}

function SettingsView() {
  return <div className="full-view"><div className="view-intro"><div><span className="eyebrow">PREFERENCES</span><h2>Shape the rules. Keep control.</h2><p>Deterministic scheduling honors these boundaries every time.</p></div></div><section className="panel settings-card"><div className="setting"><div><strong>Day boundary</strong><span>Study blocks may be placed between these hours.</span></div><div className="field-pair"><button>8:00 AM</button><span>to</span><button>10:00 PM</button></div></div><div className="setting"><div><strong>Maximum focus block</strong><span>Longer work is split into sustainable sessions.</span></div><button>90 minutes</button></div><div className="setting"><div><strong>Deadline safety buffer</strong><span>Finish comfortably before the real deadline.</span></div><button>12 hours</button></div><div className="setting"><div><strong>Demo mode</strong><span>Use realistic local courses without credentials.</span></div><div className="toggle on"><i /></div></div><div className="integration-row"><div><span className="integration-icon">C</span><p><strong>Canvas LMS</strong><small>Ready for Phase 3 connector setup</small></p></div><button>Configure</button></div></section></div>
}

function CalibrationModal({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const [answer, setAnswer] = useState('')
  return <div className="modal-wrap" role="dialog" aria-modal="true"><div className="modal"><div className="modal-top"><div><span className="eyebrow">3-QUESTION CALIBRATION</span><h2>{assignment.title}</h2></div><button onClick={onClose} aria-label="Close"><X size={19} /></button></div><div className="question-progress"><i className="done" /><i /><i /><span>Question 1 of 3</span></div><div className="question-type"><BookOpen size={16} /> Conceptual understanding</div><h3>In your own words, explain what must be true for a rigid body to be in static equilibrium. Include both translational and rotational conditions.</h3><textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write your reasoning here…" autoFocus /><div className="modal-note"><LockKeyhole size={14} /> Your answer updates mastery only after deterministic weighting.</div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Save for later</button><button className="primary-button" disabled={!answer.trim()}>Next question <ArrowRight size={15} /></button></div></div></div>
}

function App() {
  const [active, setActive] = useState<NavItem>('Today')
  const [data, setData] = useState<DashboardData>(demoData)
  const [connected, setConnected] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [theme, setTheme] = useState(() => localStorage.getItem('cadence-theme') || 'light')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [calibration, setCalibration] = useState<Assignment | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('cadence-theme', theme) }, [theme])
  useEffect(() => { fetch(`${API}/dashboard`).then(r => { if (!r.ok) throw new Error(); return r.json() }).then(json => { setData(json); setConnected(true) }).catch(() => setConnected(false)) }, [])
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3000); return () => clearTimeout(id) }, [toast])
  const focusAssignment = useMemo(() => data.assignments.find(a => a.risk === 'MEDIUM' && a.state === 'SCHEDULED') || data.assignments[0], [data.assignments])

  const sync = async () => {
    setSyncing(true)
    try {
      if (connected) {
        await fetch(`${API}/schedule/recompute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'manual dashboard sync' }) })
        const response = await fetch(`${API}/dashboard`)
        setData(await response.json())
      } else await new Promise(r => setTimeout(r, 800))
      setToast(connected ? 'Schedule recomputed from current local data.' : 'Demo refreshed. Start the backend to persist changes.')
    } finally { setSyncing(false) }
  }

  return <div className="app-shell"><Sidebar active={active} onChange={setActive} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} /><main><Header active={active} onMenu={() => setMobileOpen(true)} theme={theme} setTheme={setTheme} onSync={sync} syncing={syncing} />
    {active === 'Today' && <div className="dashboard"><div className="mode-banner"><span><i className={connected ? 'connected' : ''} />{connected ? 'Local engine connected' : 'Previewing resilient demo data'}</span><small>{connected ? 'SQLite is authoritative' : 'Start the API to persist scheduling decisions'}</small></div><StatStrip data={data} /><div className="dashboard-grid"><TodayTimeline events={data.events} /><FocusCard assignment={focusAssignment} /><WeekCalendar events={data.events} weekOffset={weekOffset} setWeekOffset={setWeekOffset} /><AssignmentQueue assignments={data.assignments} onCalibrate={setCalibration} /></div></div>}
    {active === 'Calendar' && <div className="full-view"><WeekCalendar events={data.events} weekOffset={weekOffset} setWeekOffset={setWeekOffset} /></div>}
    {active === 'Assignments' && <AssignmentsView assignments={data.assignments} onCalibrate={setCalibration} />}
    {active === 'Mastery' && <MasteryView />}
    {active === 'Settings' && <SettingsView />}
  </main>{calibration && <CalibrationModal assignment={calibration} onClose={() => setCalibration(null)} />}{toast && <div className="toast"><Check size={16} />{toast}</div>}</div>
}

export default App
