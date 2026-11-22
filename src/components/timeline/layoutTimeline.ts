import { monthYear, type MonthIndex, type TimelineData, type TimelineEvent } from "./buildTimeline";
import { TL } from "./timelineTheme";

/**
 * Geometry of the horizontal timeline, git-graph style:
 * - the trunk (you) runs in the middle and gets thicker with every new skill,
 * - each job is a branch above it, each degree a branch below it, parallel ones on separate lanes,
 * - projects branch off the job they were done in (or off the trunk, below, for personal ones).
 * Everything is in scene pixels; the page zooms the scene to fit the window height.
 */
const PX_PER_MONTH = 18;
const PAD_LEFT = 150;
const TOP_SPACE = 96; // year watermarks
const BOTTOM_SPACE = 56; // year labels
const JOB_FIRST = 102; // distance trunk → first job lane
const JOB_GAP = 78; // between a lane's top project row and the next job lane
const PROJECT_ROW = 48;
const EDU_FIRST = 100;
const EDU_ROW = 52;
const PERSONAL_GAP = 62;
const MAX_CHIPS = 3;
const LANE_GAP = 36;

const WAVE_AMPLITUDE = 5;
const smoothstep = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const textWidth = (text: string, px: number) => text.length * px;
const chipsWidth = (chips: string[], more: number) =>
  chips.reduce((w, c) => w + textWidth(c, 6.1) + 30, 0) + (more > 0 ? 34 : 0);

export type BranchRole = "job" | "education" | "project" | "personal";

export interface BranchLayout {
  event: TimelineEvent;
  role: BranchRole;
  color: string;
  x0: number;
  x1: number;
  laneY: number;
  /** y of the line this branch leaves from and merges back into */
  baseY: (x: number) => number;
  path: string;
  open: boolean; // still going: runs to today instead of merging back
  labelX: number;
  chips: string[];
  more: number;
  initials: string;
}

export interface Milestone {
  x: number;
  label: string;
  key: string;
}

export interface SceneLayout {
  width: number;
  height: number;
  mid: number;
  wave: (x: number) => number;
  startX: number;
  todayX: number;
  finaleX: number;
  xOf: (month: MonthIndex) => number;
  monthAt: (x: number) => MonthIndex;
  band: string;
  branches: BranchLayout[];
  years: { year: number; x: number }[];
  growth: { x: number; total: number; eventKey: string }[];
  milestones: Milestone[];
}

const initialsOf = (text: string | undefined, fallback: string) => {
  const words = (text || fallback).replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "•";
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
};

/** Greedy lane packing on visual extents, so labels never collide. */
const packLanes = <T extends { start: number; end: number }>(items: T[]) => {
  const ends: number[] = [];
  return items.map((item) => {
    let lane = ends.findIndex((end) => end + LANE_GAP < item.start);
    if (lane === -1) {
      lane = ends.length;
      ends.push(item.end);
    } else {
      ends[lane] = item.end;
    }
    return { item, lane };
  });
};

const branchPath = (x0: number, y0: number, x1: number, y1: number, laneY: number, open: boolean) => {
  const rise = Math.min(120, Math.max(40, Math.abs(laneY - y0) * 0.42));
  const out = `M${x0},${y0} C${x0 + rise * 0.75},${y0} ${x0 + rise * 0.25},${laneY} ${x0 + rise},${laneY}`;
  if (open) return { d: `${out} L${x1},${laneY}`, rise };
  const back = Math.min(120, Math.max(40, Math.abs(laneY - y1) * 0.42));
  return { d: `${out} L${x1 - back},${laneY} C${x1 - back * 0.25},${laneY} ${x1 - back * 0.75},${y1} ${x1},${y1}`, rise };
};

export function layoutTimeline(data: TimelineData): SceneLayout {
  const range = data.range!;
  const axisStart = monthYear(range.start) * 12;
  const xOf = (month: MonthIndex) => PAD_LEFT + (month - axisStart) * PX_PER_MONTH;
  const monthAt = (x: number) => Math.floor((x - PAD_LEFT) / PX_PER_MONTH) + axisStart;
  const startX = xOf(range.start) - 60;
  const todayX = xOf(data.now) + PX_PER_MONTH / 2;
  const endOf = (e: TimelineEvent, minWidth: number) =>
    e.ongoing ? todayX : Math.max(xOf(e.start!) + minWidth, xOf((e.end ?? e.start!) + 1));

  const jobs = data.events.filter((e) => e.kind === "experience");
  const degrees = data.events.filter((e) => e.kind === "education");
  const jobKeys = new Set(jobs.map((e) => e.key));
  const linked = data.events.filter((e) => e.kind === "project" && e.parentKey && jobKeys.has(e.parentKey));
  const personal = data.events.filter((e) => e.kind === "project" && !(e.parentKey && jobKeys.has(e.parentKey)));

  const chipsOf = (e: TimelineEvent) => ({ chips: e.newSkills.slice(0, MAX_CHIPS), more: Math.max(0, e.newSkills.length - MAX_CHIPS) });

  // ---- lanes (relative y: 0 is the trunk, negative is above) ----
  const jobLane = packLanes(
    jobs.map((e) => {
      const { chips, more } = chipsOf(e);
      const label = 46 + Math.max(textWidth(e.organization || e.title, 7.6), textWidth(e.title, 6.2)) + 16 + chipsWidth(chips, more);
      const x0 = xOf(e.start!);
      return { e, start: x0, end: Math.max(endOf(e, 120), x0 + 90 + label) };
    }),
  );
  const laneCount = Math.max(0, ...jobLane.map((j) => j.lane + 1));

  // projects done in a job ride above that job's lane, on rows shared by the jobs of the same lane
  const projectRows = new Map<string, number>();
  const rowsPerLane: number[] = Array.from({ length: laneCount }, () => 0);
  for (let lane = 0; lane < laneCount; lane++) {
    const laneJobs = new Set(jobLane.filter((j) => j.lane === lane).map((j) => j.item.e.key));
    const packed = packLanes(
      linked
        .filter((p) => laneJobs.has(p.parentKey!))
        .map((p) => {
          const { chips, more } = chipsOf(p);
          const x0 = xOf(p.start!);
          return { p, start: x0, end: Math.max(endOf(p, 110), x0 + 60 + textWidth(p.title, 6.9) + 40 + chipsWidth(chips, more)) };
        }),
    );
    packed.forEach(({ item, lane: row }) => projectRows.set(item.p.key, row));
    rowsPerLane[lane] = Math.max(0, ...packed.map((p) => p.lane + 1));
  }

  const jobY: number[] = [];
  let cursor = -JOB_FIRST;
  for (let lane = 0; lane < laneCount; lane++) {
    jobY[lane] = cursor;
    cursor = cursor - rowsPerLane[lane] * PROJECT_ROW - JOB_GAP;
  }
  const topRel = laneCount ? cursor + JOB_GAP - 30 : -60;

  const eduLane = packLanes(
    degrees.map((e) => {
      const { chips, more } = chipsOf(e);
      const x0 = xOf(e.start!);
      return { e, start: x0, end: Math.max(endOf(e, 120), x0 + 90 + 46 + textWidth(e.organization || e.title, 7.4) + 16 + chipsWidth(chips, more)) };
    }),
  );
  const eduCount = Math.max(0, ...eduLane.map((l) => l.lane + 1));
  const personalLane = packLanes(
    personal.map((p) => {
      const { chips, more } = chipsOf(p);
      const x0 = xOf(p.start!);
      return { p, start: x0, end: Math.max(endOf(p, 110), x0 + 70 + textWidth(p.title, 6.9) + 40 + chipsWidth(chips, more)) };
    }),
  );
  const personalFirst = eduCount ? EDU_FIRST + (eduCount - 1) * EDU_ROW + PERSONAL_GAP : EDU_FIRST;
  const personalCount = Math.max(0, ...personalLane.map((l) => l.lane + 1));
  const bottomRel = Math.max(
    90,
    eduCount ? EDU_FIRST + (eduCount - 1) * EDU_ROW + 30 : 0,
    personalCount ? personalFirst + (personalCount - 1) * PROJECT_ROW + 30 : 0,
  );

  const mid = TOP_SPACE - topRel;
  const height = mid + bottomRel + BOTTOM_SPACE;
  const wave = (x: number) => mid + Math.sin(x / 230) * WAVE_AMPLITUDE;

  // ---- branches ----
  const branches: BranchLayout[] = [];
  const jobBranch = new Map<string, BranchLayout>();
  jobLane.forEach(({ item: { e }, lane }, index) => {
    const color = TL.jobs[index % TL.jobs.length];
    const laneY = mid + jobY[lane];
    const x0 = xOf(e.start!);
    const x1 = endOf(e, 120);
    const { d, rise } = branchPath(x0, wave(x0), x1, wave(x1), laneY, e.ongoing);
    const branch: BranchLayout = {
      event: e, role: "job", color, x0, x1, laneY, baseY: wave, path: d, open: e.ongoing,
      labelX: x0 + rise + 6, ...chipsOf(e), initials: initialsOf(e.organization, e.title),
    };
    branches.push(branch);
    jobBranch.set(e.key, branch);
  });

  eduLane.forEach(({ item: { e }, lane }) => {
    const laneY = mid + EDU_FIRST + lane * EDU_ROW;
    const x0 = xOf(e.start!);
    const x1 = endOf(e, 120);
    const { d, rise } = branchPath(x0, wave(x0), x1, wave(x1), laneY, e.ongoing);
    branches.push({
      event: e, role: "education", color: TL.education, x0, x1, laneY, baseY: wave, path: d, open: e.ongoing,
      labelX: x0 + rise + 6, ...chipsOf(e), initials: initialsOf(e.organization, e.title),
    });
  });

  linked.forEach((p) => {
    const parent = jobBranch.get(p.parentKey!)!;
    const parentLane = jobLane.find((j) => j.item.e.key === p.parentKey)!.lane;
    const row = projectRows.get(p.key) ?? 0;
    const laneY = mid + jobY[parentLane] - (row + 1) * PROJECT_ROW;
    const jobStart = parent.labelX;
    const jobEnd = parent.open ? todayX : parent.x1 - 50;
    const x0 = Math.min(Math.max(xOf(p.start!), jobStart + 8), jobEnd - 70);
    const open = p.ongoing && parent.open;
    const x1 = open ? todayX : Math.max(x0 + 70, Math.min(endOf(p, 110), jobEnd));
    const { d, rise } = branchPath(x0, parent.laneY, x1, parent.laneY, laneY, open);
    branches.push({
      event: p, role: "project", color: parent.color, x0, x1, laneY, baseY: () => parent.laneY, path: d, open,
      labelX: x0 + rise + 4, ...chipsOf(p), initials: "",
    });
  });

  personalLane.forEach(({ item: { p }, lane }) => {
    const laneY = mid + personalFirst + lane * PROJECT_ROW;
    const x0 = xOf(p.start!);
    const x1 = endOf(p, 110);
    const { d, rise } = branchPath(x0, wave(x0), x1, wave(x1), laneY, p.ongoing);
    branches.push({
      event: p, role: "personal", color: TL.personal, x0, x1, laneY, baseY: wave, path: d, open: p.ongoing,
      labelX: x0 + rise + 4, ...chipsOf(p), initials: "",
    });
  });

  // ---- trunk: thicker with every skill ----
  const growth = data.growth.map((g) => ({ x: xOf(g.month), total: g.total, eventKey: g.eventKey }));
  const totalSkills = Math.max(1, growth.at(-1)?.total ?? 0);
  const steps = growth.map((g, i) => ({ x: g.x, inc: g.total - (i ? growth[i - 1].total : 0) }));
  const thickness = (x: number) =>
    5 + (17 * steps.reduce((sum, s) => sum + s.inc * smoothstep((x - s.x + 10) / 110), 0)) / totalSkills;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let x = startX; x <= todayX + 0.1; x += 5) {
    const half = thickness(x) / 2;
    const y = wave(x);
    top.push(`${x.toFixed(1)},${(y - half).toFixed(1)}`);
    bottom.push(`${x.toFixed(1)},${(y + half).toFixed(1)}`);
  }
  const band = [...top, ...bottom.reverse()].join(" ");

  // ---- milestones: the moments worth a flag ----
  const raw: Milestone[] = [];
  if (jobs[0]) raw.push({ x: xOf(jobs[0].start!), label: "First job", key: "first-job" });
  const firstProject = data.events.find((e) => e.kind === "project");
  if (firstProject) raw.push({ x: xOf(firstProject.start!), label: "First project", key: "first-project" });
  [10, 25, 50, 100, 200].forEach((n) => {
    const reached = data.growth.find((g) => g.total >= n);
    if (reached) raw.push({ x: xOf(reached.month), label: `${n} skills`, key: `skills-${n}` });
  });
  // years spent in jobs (overlapping jobs count once)
  const yearMarks = [1, 3, 5, 10, 15, 20, 30];
  let worked = 0;
  let nextMark = 0;
  for (let m = range.start; m <= data.now && nextMark < yearMarks.length; m++) {
    if (jobs.some((j) => j.start! <= m && (j.end ?? j.start!) >= m)) worked++;
    if (worked >= yearMarks[nextMark] * 12) {
      raw.push({ x: xOf(m), label: `${yearMarks[nextMark]} year${yearMarks[nextMark] > 1 ? "s" : ""} in`, key: `years-${yearMarks[nextMark]}` });
      nextMark++;
    }
  }
  const milestones: Milestone[] = [];
  raw.sort((a, b) => a.x - b.x).forEach((m) => {
    if (!milestones.length || m.x - milestones[milestones.length - 1].x > 96) milestones.push(m);
  });

  const firstYear = monthYear(range.start);
  const lastYear = monthYear(data.now);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => ({ year: firstYear + i, x: xOf((firstYear + i) * 12) }));

  const finaleX = todayX + 150;
  return { width: finaleX + 420, height, mid, wave, startX, todayX, finaleX, xOf, monthAt, band, branches, years, growth, milestones };
}

/** What the journey looked like at a given month: drives the counters while scrolling. */
export function statsAt(data: TimelineData, month: MonthIndex) {
  // at today, also count skills that only come from undated items, so the counter matches the finale
  const skills = month >= data.now ? data.stats.skills : data.growth.filter((g) => g.month <= month).at(-1)?.total ?? 0;
  const started = data.events.filter((e) => e.start! <= month);
  let professional = 0;
  let cursor = -Infinity;
  started
    .filter((e) => e.kind === "experience")
    .map((e) => [e.start!, Math.min(e.end ?? e.start!, month)] as const)
    .sort((a, b) => a[0] - b[0])
    .forEach(([start, end]) => {
      const from = Math.max(start, cursor);
      if (end + 1 > from) professional += end + 1 - from;
      cursor = Math.max(cursor, end + 1);
    });
  return {
    year: monthYear(month),
    skills,
    roles: started.filter((e) => e.kind === "experience").length,
    projects: started.filter((e) => e.kind === "project").length,
    years: professional / 12,
  };
}
