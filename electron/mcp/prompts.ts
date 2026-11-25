import { lines } from './core/format';
import type { PromptDef } from './core/types';

const HANDLE = /^(o\d+|[a-z][0-9a-f]{6})$/;
const REPLY = 'Reply in my language. Ask before any change in CV Maker that I did not request.';

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** A handle is passed on; anything longer is the offer itself, quoted for the model. */
function offerTarget(offer: string | undefined): { what: string; how: string; text: string } {
  const value = offer?.trim() ?? '';
  if (!value) return { what: 'an offer', how: 'ask me which one first (list_opportunities shows my queue, or I paste one)', text: '' };
  if (HANDLE.test(value)) {
    return { what: `the offer ${value}`, how: value.startsWith('o') ? `opportunity_id "${value}"` : `application_id "${value}"`, text: '' };
  }
  return { what: 'the offer below', how: 'offer: its title, company and full text', text: `\nOffer:\n<<<\n${value}\n>>>` };
}

export const MCP_PROMPTS: PromptDef[] = [
  {
    name: 'tailor_resume',
    permissions: ['profile_read', 'opportunities_read', 'resumes_write'],
    title: 'Tailor my resume to an offer',
    description: 'Analyzes an offer against the profile and drafts a tailored resume in CV Maker, for the user to review and export.',
    arguments: [
      { name: 'offer', description: 'A queued offer (o42), an application (a1b2c3d) or the offer text.' },
      { name: 'focus', description: 'What to stress, e.g. "backend", "leadership".' },
    ],
    render: ({ offer, focus }) => {
      const target = offerTarget(offer);
      return lines(
        `Tailor a resume in CV Maker for ${target.what}.`,
        `1. analyze_offer with ${target.how}. Read the evidence it ranks, then get_profile_items for the texts you will rewrite.`,
        '2. Before drafting, tell me in a few lines: the match, the strengths to put forward, the gaps, and any skill my profile uses but does not declare (I may add it).' +
          (focus ? ` Stress: ${focus}.` : ' Ask what to stress if it is unclear.'),
        '3. draft_resume: the 1-2 most relevant experiences and 2-4 projects, 3-5 bullets each, best first; a headline and a 2-3 sentence summary in the offer\'s language. ' +
          'Reword bullets with the offer\'s terms, facts from my profile only: no new tool, figure or result.',
        '4. Show what you changed, list the figures the tool asks me to check, and remind me to review the draft in CV Maker (Dashboard → AI Review) and export the PDF.',
        REPLY,
        target.text,
      );
    },
  },
  {
    name: 'prepare_interview',
    permissions: ['applications_read', 'interview_read', 'profile_read'],
    title: 'Prepare an interview',
    description: 'Brief, likely questions, answers from the profile and a mock interview for one application; saves the prep the user keeps.',
    arguments: [
      { name: 'application', description: 'Application handle, or the company name.', required: true },
      { name: 'kind', description: 'Recruiter screen, technical, behavioral, final...' },
    ],
    render: ({ application, kind }) => lines(
      `Prepare me for my ${kind ? `${kind} ` : ''}interview for ${application}.`,
      `1. ${HANDLE.test(application.trim()) ? '' : 'Find the application with list_applications (search), then '}interview_prep with its application_id, and get_application with include offer and timeline.`,
      '2. A one-screen brief: the role and what they look for; the 3-4 stories from my profile that prove it (search_profile, STAR, my facts only); ' +
        'the gaps they may probe and how to answer them honestly; 3 sharp questions to ask them.',
      '3. The likely questions, with my prepared answers where they exist and drafts in my voice for the others.',
      '4. Offer a mock interview: one question at a time, feedback after each answer.',
      '5. Then save_prep the questions and answers I keep, linked to this application.',
      REPLY,
    ),
  },
  {
    name: 'weekly_review',
    permissions: ['applications_read'],
    title: 'Weekly job search review',
    description: 'What moved in the pipeline, what works, follow-ups due and the best new offers, with next week\'s actions.',
    arguments: [{ name: 'since', description: 'Start day, YYYY-MM-DD (default: 7 days ago).' }],
    render: ({ since }) => {
      const start = since?.trim() || localDay(new Date(Date.now() - 7 * 24 * 3600 * 1000));
      return lines(
        `Weekly review of my job search since ${start}.`,
        `1. pipeline_insights with since "${start}", and list_applications for what moved.`,
        '2. Briefly: what I sent, the answers I got, what works (channels, titles, keywords) and what does not.',
        '3. Follow-ups: the reminders due and the applications silent for long; for each, a short follow-up message or closing it (update_application once I agree).',
        '4. New offers: list_opportunities with min_score 55, the 3 best fits and why; shortlist or dismiss them with update_opportunities once I agree.',
        '5. End with 3 concrete actions for next week.',
        REPLY,
      );
    },
  },
  {
    name: 'find_jobs',
    permissions: ['profile_read', 'opportunities_read'],
    title: 'Find jobs worth applying to',
    description: 'Ranks the offers CV Maker found (and, if the client can search the web, new ones) against the profile, then queues the user\'s picks.',
    arguments: [{ name: 'criteria', description: 'E.g. "remote backend, Toronto, 90k+".' }],
    render: ({ criteria }) => lines(
      `Help me find jobs worth applying to${criteria ? `: ${criteria}` : ''}.`,
      '1. profile_overview, then list_opportunities with filters that fit my criteria.',
      '2. If you can search the web, look for current offers that fit on company career pages and job boards; run analyze_offer on the promising ones with their text. Keep only real offers with a link.',
      '3. Rank the best 5: why each fits, the main gap, the salary when known. Flag the ones like applications that got no answer before (pipeline_insights).',
      '4. Then update_opportunities: queue the new ones I pick, shortlist or dismiss the others. I can ask for a tailored resume next.',
      REPLY,
    ),
  },
  {
    name: 'career_advice',
    permissions: ['profile_read', 'applications_read'],
    title: 'Career advice from my data',
    description: 'An honest read of the profile and of what the applications show, with concrete next steps.',
    arguments: [{ name: 'question', description: 'What you want advice on (optional).' }],
    render: ({ question }) => lines(
      `Act as my career coach${question ? ` on this: ${question}` : ''}.`,
      '1. profile_overview, then pipeline_insights: response and interview rates, channels, titles, market keywords.',
      '2. An honest read: my strongest angle, the roles I am most credible for, the skills the market asks that my profile lacks or hides, and what my results suggest changing.',
      '3. 3-5 concrete next steps, each tied to something in my data. Ask about my goals and constraints when you need them.',
      REPLY,
    ),
  },
];
