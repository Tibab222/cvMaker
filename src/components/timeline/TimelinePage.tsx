import { animate, motion, useReducedMotion, useSpring, useTransform, type AnimationPlaybackControls } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeftToLine, ArrowRightToLine, CalendarPlus, FolderKanban, GraduationCap, MousePointer2, Play, Plus, Route, Star } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProfileStore } from "@/store/profile";
import { Tabs, useUiStore } from "@/store/ui";
import { EASE_OUT } from "@/lib/motion";
import { buildTimeline, formatDuration, formatPeriod, type TimelineData, type TimelineEvent, type TimelineKind } from "./buildTimeline";
import { layoutTimeline, statsAt, type BranchLayout, type SceneLayout } from "./layoutTimeline";
import { TL } from "./timelineTheme";

const TAB_FOR_KIND: Record<TimelineKind, Tabs> = {
  education: Tabs.EDUCATION,
  experience: Tabs.EXPERIENCE,
  project: Tabs.PROJECTS,
};

/** A deterministic burst of confetti around "today" (no Math.random, so renders stay pure). */
const CONFETTI = Array.from({ length: 34 }, (_, i) => {
  const angle = (i / 34) * Math.PI * 2 + (i % 3) * 0.21;
  const distance = 70 + ((i * 37) % 90);
  const colors = [...TL.jobs, TL.education, TL.personal, TL.skill, TL.milestone];
  return {
    dx: Math.cos(angle) * distance,
    dy: Math.sin(angle) * distance * 0.8,
    size: 4 + (i % 4) * 2,
    round: i % 2 === 0,
    rotate: (i * 47) % 360,
    color: colors[i % colors.length],
    delay: (i % 6) * 0.03,
  };
});

// ---------------------------------------------------------------- small pieces

function SpringNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring = useSpring(value, { stiffness: 90, damping: 20 });
  const text = useTransform(spring, (v) => v.toFixed(decimals));
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  return <motion.span className="tabular-nums">{text}</motion.span>;
}

function Counter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-semibold leading-none tracking-tight text-slate-900">{children}</span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}

function SkillChips({ chips, more, show, delay = 0 }: { chips: string[]; more: number; show: boolean; delay?: number }) {
  if (!chips.length) return null;
  return (
    <div className="flex gap-1">
      {chips.map((chip, i) => (
        <motion.span
          key={chip}
          initial={false}
          animate={show ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.5, y: 6 }}
          transition={{ type: "spring", stiffness: 520, damping: 22, delay: show ? delay + i * 0.08 : 0 }}
          className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 shadow-[0_2px_10px_-3px_rgba(16,185,129,0.45)]"
        >
          +{chip}
        </motion.span>
      ))}
      {more > 0 && (
        <motion.span
          initial={false}
          animate={{ opacity: show ? 1 : 0 }}
          transition={{ delay: show ? delay + chips.length * 0.08 : 0 }}
          className="whitespace-nowrap rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
        >
          +{more}
        </motion.span>
      )}
    </div>
  );
}

function EventDetails({ event }: { event: TimelineEvent }) {
  const reused = event.skills.filter((s) => !event.newSkills.includes(s));
  return (
    <div className="max-w-72 space-y-1">
      <p className="font-semibold">{event.title}</p>
      {event.organization && <p className="opacity-75">{event.organization}</p>}
      <p className="opacity-75">
        {formatPeriod(event)}
        {event.durationMonths > 0 && ` · ${formatDuration(event.durationMonths)}`}
        {event.approximate && " · dates of the job"}
      </p>
      {event.newSkills.length > 0 && <p>New: {event.newSkills.join(", ")}</p>}
      {reused.length > 0 && <p className="opacity-70">Also: {reused.join(", ")}</p>}
    </div>
  );
}

function BranchPill({ branch, onHover }: { branch: BranchLayout; onHover: (key: string | null) => void }) {
  const { event, color, role } = branch;
  const big = role === "job" || role === "education";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => onHover(event.key)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(event.key)}
          onBlur={() => onHover(null)}
          className="flex items-center gap-2 whitespace-nowrap rounded-full border bg-white/95 py-1 pl-1 pr-3 shadow-[0_6px_20px_-10px_rgba(76,29,149,0.45)] outline-none backdrop-blur transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-violet-200"
          style={{ borderColor: `${color}55` }}
        >
          <span
            className={big ? "flex size-7 items-center justify-center rounded-full text-[11px] font-bold text-white" : "flex size-5 items-center justify-center rounded-full text-white"}
            style={{ background: color, boxShadow: `0 0 0 3px ${color}22` }}
          >
            {role === "education" ? <GraduationCap size={14} /> : role === "job" ? branch.initials : <FolderKanban size={11} />}
          </span>
          {big ? (
            <span className="flex items-baseline gap-1.5">
              <span className="text-[13px] font-semibold text-slate-800">{event.organization || event.title}</span>
              {event.organization && <span className="max-w-44 truncate text-[11px] text-slate-500">{event.title}</span>}
            </span>
          ) : (
            <span className="max-w-52 truncate text-xs font-medium" style={{ color }}>
              {event.title}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side={branch.laneY < branch.baseY(branch.x0) ? "top" : "bottom"}>
        <EventDetails event={event} />
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------- scene

function Scene({
  data,
  layout,
  reveal,
  onNextChapter,
}: {
  data: TimelineData;
  layout: SceneLayout;
  reveal: number;
  onNextChapter: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const seen = (x: number) => x <= reveal + 6;
  const ended = reveal >= layout.todayX - 40;
  const { wave, mid, todayX } = layout;

  const related = (b: BranchLayout) => {
    if (!hovered) return true;
    if (b.event.key === hovered || b.event.parentKey === hovered) return true;
    return data.byKey.get(hovered)?.parentKey === b.event.key;
  };
  const companies = new Set(data.events.filter((e) => e.kind === "experience").map((e) => (e.organization || e.title).toLowerCase())).size;

  return (
    <div className="relative shrink-0" style={{ width: layout.width, height: layout.height }}>
      {/* years */}
      {layout.years.map(({ year, x }) => (
        <div key={year} className="pointer-events-none absolute inset-y-0" style={{ left: x }}>
          <div className="absolute inset-y-8 w-px bg-gradient-to-b from-transparent via-violet-200/70 to-transparent" />
          <span className="absolute left-3 top-2 select-none font-mono text-[96px] font-black leading-none tracking-tighter text-violet-500/[0.05]">
            {year}
          </span>
          <span className="absolute bottom-3 left-2 font-mono text-xs font-semibold text-slate-400">{year}</span>
        </div>
      ))}

      <svg className="pointer-events-none absolute inset-0" width={layout.width} height={layout.height}>
        <defs>
          <linearGradient id="tl-trunk" gradientUnits="userSpaceOnUse" x1={layout.startX} x2={todayX} y1="0" y2="0">
            {TL.trunkStops.map((color, i) => (
              <stop key={color} offset={`${(i / (TL.trunkStops.length - 1)) * 100}%`} stopColor={color} />
            ))}
          </linearGradient>
          <filter id="tl-glow" x="-20%" y="-200%" width="140%" height="500%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <clipPath id="tl-reveal">
            <rect x="0" y="0" width={Math.max(0, reveal)} height={layout.height} />
          </clipPath>
        </defs>

        {/* the whole map, waiting to be travelled */}
        {layout.branches.map((b) => (
          <path key={`ghost-${b.event.key}`} d={b.path} fill="none" stroke={b.color} strokeOpacity={0.1} strokeWidth={3} strokeLinecap="round" />
        ))}
        <polygon points={layout.band} fill="#f3effe" />
        <line x1={todayX} y1={wave(todayX)} x2={layout.finaleX - 14} y2={wave(todayX)} stroke="#c4b5fd" strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" opacity={ended ? 1 : 0.4} />

        {/* what has been travelled */}
        <g clipPath="url(#tl-reveal)">
          {layout.branches.map((b) => (
            <path key={`glow-${b.event.key}`} d={b.path} fill="none" stroke={b.color} strokeWidth={10} opacity={related(b) ? 0.2 : 0.04} filter="url(#tl-glow)" />
          ))}
          {layout.branches.map((b) => (
            <path
              key={b.event.key}
              d={b.path}
              fill="none"
              stroke={b.color}
              strokeWidth={hovered === b.event.key ? 6 : b.role === "job" || b.role === "education" ? 4.5 : 3}
              strokeLinecap="round"
              strokeDasharray={b.event.approximate ? "1 7" : undefined}
              opacity={related(b) ? 1 : 0.2}
              style={{ transition: "opacity 250ms, stroke-width 250ms" }}
            />
          ))}
          <polygon points={layout.band} fill="url(#tl-trunk)" filter="url(#tl-glow)" opacity={0.4} />
          <polygon points={layout.band} fill="url(#tl-trunk)" opacity={hovered ? 0.6 : 1} style={{ transition: "opacity 250ms" }} />
          {/* commits: where branches leave and come back */}
          {layout.branches.map((b) => (
            <g key={`dots-${b.event.key}`} opacity={related(b) ? 1 : 0.25}>
              <circle cx={b.x0} cy={b.baseY(b.x0)} r={4.5} fill={b.color} stroke="white" strokeWidth={2} />
              {!b.open && <circle cx={b.x1} cy={b.baseY(b.x1)} r={4} fill="white" stroke={b.color} strokeWidth={2.5} />}
            </g>
          ))}
        </g>
      </svg>

      {/* day one */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: layout.startX, top: wave(layout.startX) }}>
        <span className="block size-5 rounded-full border-[5px] border-violet-300 bg-white shadow-[0_0_0_6px_rgba(167,139,250,0.15)]" />
        <span className="absolute bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-400">Day one</span>
          <span className="block text-sm font-semibold text-slate-700">{layout.years[0]?.year}</span>
        </span>
      </div>

      {/* new skills, as sparks on the trunk */}
      {layout.growth.map((g) => (
        <motion.span
          key={`g-${g.eventKey}`}
          className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400"
          style={{ left: g.x + 55, top: wave(g.x + 55), boxShadow: "0 0 0 3px white, 0 0 14px 4px rgba(16,185,129,0.55)" }}
          initial={false}
          animate={seen(g.x + 55) ? { scale: [0, 1.9, 1], opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      ))}

      {/* milestones */}
      {layout.milestones.map((m) => {
        const show = seen(m.x);
        return (
          <motion.div
            key={m.key}
            className="pointer-events-none absolute flex -translate-x-1/2 flex-col items-center"
            style={{ left: m.x, top: wave(m.x) - 7 }}
            initial={false}
            animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
          >
            <span className="size-3.5 rotate-45 rounded-[3px] border-2 border-white bg-amber-400 shadow-[0_0_14px_3px_rgba(245,158,11,0.5)]" />
            <span className="mt-2.5 flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
              <Star size={9} className="fill-amber-400 text-amber-400" /> {m.label}
            </span>
          </motion.div>
        );
      })}

      {/* labels riding each branch */}
      {layout.branches.map((b) => {
        const show = seen(b.labelX);
        return (
          <motion.div
            key={`label-${b.event.key}`}
            className="absolute flex -translate-y-1/2 items-center gap-2"
            style={{ left: b.labelX, top: b.laneY, zIndex: hovered === b.event.key ? 20 : 10 }}
            initial={false}
            animate={show ? { opacity: related(b) ? 1 : 0.35, x: 0, scale: 1 } : { opacity: 0, x: -14, scale: 0.9 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          >
            <BranchPill branch={b} onHover={setHovered} />
            <SkillChips chips={b.chips} more={b.more} show={show} delay={0.25} />
          </motion.div>
        );
      })}

      {/* still going: a live tip at the end of the branch */}
      {layout.branches.filter((b) => b.open).map((b) => (
        <motion.span
          key={`tip-${b.event.key}`}
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2"
          style={{ left: b.x1, top: b.laneY }}
          initial={false}
          animate={{ opacity: seen(b.x1 - 30) ? 1 : 0 }}
        >
          <span className="absolute inset-0 animate-ping rounded-full" style={{ background: b.color }} />
          <span className="absolute inset-0 rounded-full border-2 border-white" style={{ background: b.color }} />
        </motion.span>
      ))}

      {/* the head of the line while travelling */}
      {!ended && reveal > layout.startX + 4 && (
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600"
          style={{ left: reveal, top: wave(reveal), boxShadow: "0 0 0 4px white, 0 0 30px 10px rgba(124,58,237,0.45)" }}
        />
      )}

      {/* today */}
      <div className="absolute" style={{ left: todayX, top: wave(todayX) }}>
        {CONFETTI.map((c, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute"
            style={{ width: c.size, height: c.size, background: c.color, borderRadius: c.round ? 999 : 2, left: -c.size / 2, top: -c.size / 2 }}
            initial={false}
            animate={ended ? { x: c.dx, y: c.dy, opacity: [0, 1, 1, 0], rotate: c.rotate, scale: 1 } : { x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
            transition={{ duration: ended ? 1.6 : 0, delay: ended ? c.delay : 0, ease: EASE_OUT }}
          />
        ))}
        <motion.div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          initial={false}
          animate={{ opacity: ended ? 1 : 0, scale: ended ? 1 : 0.4 }}
          transition={{ type: "spring", stiffness: 300, damping: 16 }}
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-violet-500/40" />
          <span className="relative block size-7 rounded-full border-4 border-white bg-violet-800 shadow-[0_0_34px_8px_rgba(124,58,237,0.45)]" />
          <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-violet-800 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
            Today
          </span>
        </motion.div>
      </div>

      {/* finale */}
      <motion.div
        className="absolute w-[360px] -translate-y-1/2"
        style={{ left: layout.finaleX, top: mid }}
        initial={false}
        animate={ended ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 30, scale: 0.96 }}
        transition={{ duration: 0.7, delay: ended ? 0.35 : 0, ease: EASE_OUT }}
      >
        <div className="relative overflow-hidden rounded-3xl border border-violet-200 bg-white/90 p-6 shadow-[0_30px_80px_-30px_rgba(76,29,149,0.55)] backdrop-blur">
          <div aria-hidden className="absolute -right-16 -top-20 size-56 rounded-full bg-gradient-to-br from-violet-300/50 to-fuchsia-200/40 blur-2xl" />
          <p className="relative font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-500">So far, you have built</p>
          <div className="relative mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              { label: "years in jobs", value: data.stats.professionalMonths / 12, decimals: 1 },
              { label: companies === 1 ? "company" : "companies", value: companies, decimals: 0 },
              { label: data.stats.projects === 1 ? "project" : "projects", value: data.stats.projects, decimals: 0 },
              { label: "skills", value: data.stats.skills, decimals: 0 },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="bg-gradient-to-br from-violet-600 to-fuchsia-500 bg-clip-text text-4xl font-black leading-none tracking-tight text-transparent">
                  <SpringNumber value={ended ? stat.value : 0} decimals={stat.decimals} />
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onNextChapter}
            className="relative mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(124,58,237,0.9)] transition-transform hover:scale-[1.02] active:scale-95"
          >
            <Plus size={16} /> Write the next chapter
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- page

function TimelineJourney({ data, onNavigate }: { data: TimelineData; onNavigate: (tab: Tabs) => void }) {
  const layout = useMemo(() => layoutTimeline(data), [data]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ playhead: layout.startX });
  const [reveal, setReveal] = useState(layout.startX);
  const dragRef = useRef<{ x: number; left: number } | null>(null);
  const travelRef = useRef<AnimationPlaybackControls | null>(null);

  // the scene is zoomed to fit the height; the start and today can both reach the middle of the screen
  const zoom = viewport.h ? Math.min(1.1, Math.max(0.4, viewport.h / layout.height)) : 1;
  const halfView = viewport.w / zoom / 2;
  const leadIn = Math.max(0, halfView - layout.startX);
  const trail = Math.max(0, halfView - (layout.width - layout.todayX));
  const geom = useRef({ zoom, leadIn });
  useLayoutEffect(() => {
    geom.current = { zoom, leadIn };
  }, [zoom, leadIn]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const readPlayhead = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return layout.startX;
    const { zoom: z, leadIn: lead } = geom.current;
    return el.scrollLeft / z - lead + el.clientWidth / z / 2;
  }, [layout.startX]);

  const scrollTargetFor = useCallback((sceneX: number) => {
    const el = scrollerRef.current;
    if (!el) return 0;
    const { zoom: z, leadIn: lead } = geom.current;
    return Math.min(el.scrollWidth - el.clientWidth, Math.max(0, (sceneX + lead) * z - el.clientWidth / 2));
  }, []);

  const stopTravel = useCallback(() => {
    travelRef.current?.stop();
    travelRef.current = null;
  }, []);

  /** Glide from where we are to today, revealing the journey on the way. */
  const travel = useCallback(
    (delay: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      stopTravel();
      const target = scrollTargetFor(layout.todayX);
      const distance = Math.abs(target - el.scrollLeft) / geom.current.zoom;
      travelRef.current = animate(el.scrollLeft, target, {
        duration: Math.min(11, Math.max(2.5, distance / 480)),
        delay,
        ease: [0.42, 0, 0.25, 1],
        onUpdate: (v) => {
          el.scrollLeft = v;
        },
      });
    },
    [layout.todayX, scrollTargetFor, stopTravel],
  );

  const ready = viewport.w > 0;
  // intro: start centred on day one, then travel to today
  useEffect(() => {
    const el = scrollerRef.current;
    if (!ready || !el) return;
    el.scrollLeft = 0;
    if (reduceMotion) {
      const revealAll = () => setReveal(layout.width);
      revealAll();
      return;
    }
    travel(0.9);
    return stopTravel;
  }, [ready, layout, reduceMotion, travel, stopTravel]);

  const replay = () => {
    const el = scrollerRef.current;
    if (!el) return;
    stopTravel();
    el.scrollLeft = 0;
    setReveal(layout.startX);
    setView({ playhead: layout.startX });
    travel(0.5);
  };

  const onScroll = () => {
    const playhead = readPlayhead();
    setView({ playhead });
    setReveal((r) => Math.max(r, playhead));
  };

  // vertical wheel scrolls the journey horizontally
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      stopTravel();
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || event.ctrlKey) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [stopTravel]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const el = scrollerRef.current;
      if (!el || (event.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) return;
      const moves: Record<string, () => void> = {
        ArrowRight: () => el.scrollBy({ left: 320, behavior: "smooth" }),
        ArrowLeft: () => el.scrollBy({ left: -320, behavior: "smooth" }),
        End: () => el.scrollTo({ left: el.scrollWidth, behavior: "smooth" }),
        Home: () => el.scrollTo({ left: 0, behavior: "smooth" }),
      };
      if (!moves[event.key]) return;
      stopTravel();
      moves[event.key]();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stopTravel]);

  const scrollToScene = (sceneX: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    stopTravel();
    el.scrollTo({ left: scrollTargetFor(sceneX), behavior: "smooth" });
  };

  // grab and drag to travel through time
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    stopTravel();
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, a")) return;
    dragRef.current = { x: event.clientX, left: scrollerRef.current?.scrollLeft ?? 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !scrollerRef.current) return;
    scrollerRef.current.scrollLeft = dragRef.current.left - (event.clientX - dragRef.current.x);
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const clamped = Math.min(layout.todayX, Math.max(layout.startX, view.playhead));
  const playMonth = Math.min(data.now, Math.max(data.range!.start, layout.monthAt(clamped)));
  const now = statsAt(data, playMonth);
  const progress = (clamped - layout.startX) / (layout.todayX - layout.startX);
  const span = layout.todayX - layout.startX;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {/* soft light background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(124,58,237,0.09)_1px,transparent_1.5px)] bg-[size:26px_26px] [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]" />
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-40 size-[34rem] rounded-full bg-violet-200/50 blur-[110px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 right-0 size-[30rem] rounded-full bg-fuchsia-100/70 blur-[110px]" />

      {/* counters: the journey as it was at the centre of the screen */}
      <header className="relative z-10 flex flex-wrap items-end justify-between gap-6 px-8 pb-1 pt-6">
        <div className="flex items-end gap-8">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-500">
              <Route size={13} /> Your journey
            </p>
            <p className="mt-1 bg-gradient-to-br from-violet-500 to-violet-900 bg-clip-text font-mono text-6xl font-black leading-none tracking-tighter text-transparent">
              <SpringNumber value={now.year} />
            </p>
          </div>
          <div className="flex gap-7 pb-1">
            <Counter label="Skills"><SpringNumber value={now.skills} /></Counter>
            <Counter label="Years in jobs"><SpringNumber value={now.years} decimals={1} /></Counter>
            <Counter label="Roles"><SpringNumber value={now.roles} /></Counter>
            <Counter label="Projects"><SpringNumber value={now.projects} /></Counter>
          </div>
        </div>
        <div className="flex items-center gap-2 pb-1">
          {data.undated.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" className="flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-violet-400 hover:text-violet-700">
                  <CalendarPlus size={13} /> {data.undated.length} without a date
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <p className="text-sm font-medium">Not on the line yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Give them a year to place them in your journey.</p>
                <div className="mt-3 flex flex-col gap-1">
                  {data.undated.map((event) => (
                    <button key={event.key} type="button" onClick={() => onNavigate(TAB_FOR_KIND[event.kind])} className="truncate rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                      {event.title}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <button type="button" onClick={replay} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-violet-300 hover:text-violet-700">
            <Play size={12} className="fill-current" /> Replay
          </button>
          <button type="button" onClick={() => scrollToScene(layout.startX)} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:border-violet-300 hover:text-violet-700">
            <ArrowLeftToLine size={13} /> Day one
          </button>
          <button type="button" onClick={() => scrollToScene(layout.todayX)} className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_6px_18px_-6px_rgba(124,58,237,0.8)] transition-colors hover:bg-violet-700">
            Today <ArrowRightToLine size={13} />
          </button>
        </div>
      </header>

      {/* the journey */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative z-0 min-h-0 flex-1 cursor-grab overflow-x-auto overflow-y-hidden active:cursor-grabbing [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex h-full w-max items-center">
          <div className="flex" style={{ zoom }}>
            <div className="shrink-0" style={{ width: leadIn }} />
            <Scene data={data} layout={layout} reveal={reveal} onNextChapter={() => onNavigate(Tabs.PROJECTS)} />
            <div className="shrink-0" style={{ width: trail }} />
          </div>
        </div>
      </div>

      {/* progress through time, also a way to jump */}
      <footer className="relative z-10 flex items-center gap-4 px-8 pb-5 pt-1">
        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <MousePointer2 size={12} /> Scroll or drag
        </span>
        <div
          role="slider"
          aria-label="Position in your journey"
          aria-valuemin={data.range!.start}
          aria-valuemax={data.now}
          aria-valuenow={playMonth}
          tabIndex={0}
          className="relative h-2 flex-1 cursor-pointer rounded-full bg-violet-100"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            scrollToScene(layout.startX + ((event.clientX - rect.left) / rect.width) * span);
          }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-300 via-violet-500 to-violet-800"
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 26 }}
          />
          {layout.branches
            .filter((b) => b.role === "job" || b.role === "education")
            .map((b) => (
              <span
                key={`mini-${b.event.key}`}
                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full opacity-70"
                style={{ left: `${((b.x0 - layout.startX) / span) * 100}%`, width: `${((b.x1 - b.x0) / span) * 100}%`, background: b.color }}
              />
            ))}
          <motion.span
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-violet-600 shadow-md"
            animate={{ left: `${progress * 100}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 26 }}
          />
        </div>
        <span className="w-9 text-right font-mono text-[11px] text-slate-400">{Math.round(progress * 100)}%</span>
      </footer>
    </div>
  );
}

export default function TimelinePage() {
  const { experience, education, projects, skills } = useProfileStore();
  const { setSelectedTab } = useUiStore();
  const [now] = useState(() => new Date());
  const data = useMemo(() => buildTimeline({ experience, education, projects, skills, now }), [experience, education, projects, skills, now]);

  if (!data.range) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-white p-8 text-center">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, ease: EASE_OUT }}
          className="h-1.5 w-72 origin-left rounded-full bg-gradient-to-r from-violet-200 via-violet-500 to-violet-200"
        />
        <p className="text-xl font-semibold text-slate-900">Your journey starts with a first step</p>
        <p className="max-w-sm text-sm text-slate-500">Add an experience, a degree or a project with its dates, and it will appear on your line.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSelectedTab(Tabs.EXPERIENCE)} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            Add an experience
          </button>
          <button type="button" onClick={() => setSelectedTab(Tabs.PROJECTS)} className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-violet-300">
            Add a project
          </button>
        </div>
      </div>
    );
  }

  return <TimelineJourney data={data} onNavigate={setSelectedTab} />;
}
