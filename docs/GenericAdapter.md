# GenericAdapter — Documentation

## What is this?

`GenericAdapter` is the **fallback extractor** for job postings. When our browser extension lands on a job page that doesn't have a dedicated adapter (like a LinkedIn-specific or Indeed-specific one), `GenericAdapter` is what tries to figure out, on its own, from any random website:

- What is the **job title**?
- What **company** is hiring?
- What is the **mandate** (the full job description)?
- Is there a **salary** mentioned anywhere?

It has no knowledge of the specific site it's running on. It works by trying several strategies, from the most trustworthy to the least, and using the best one that actually produces a usable answer.

## The core idea: a ladder of trust

For every piece of information it looks for, `GenericAdapter` climbs down a ladder of methods, from most reliable to least reliable, and stops as soon as one of them gives a good answer.

1. **Structured data the site itself publishes** (most reliable) — many job sites embed a hidden, machine-readable block of data on the page specifically so that search engines and tools like ours can read the job details without guessing. When this is present, we trust it first.
2. **Page metadata** — the invisible tags a page uses to describe itself to social networks and search engines (the same information used to generate link previews when you share a URL). Less structured than the data block above, but still written by the site itself.
3. **Visual and structural clues in the page** — if neither of the above exists, we look at what's actually visible to a human: the big heading at the top of the page, or blocks of text that "look like" they contain a job title, a company name, or a description, based on common naming patterns developers use.
4. **Weak, last-resort guesses** — if nothing else worked, we fall back to things like the browser tab's title text, or the company's website address, or simply the entire visible page content. These are marked as low-confidence so the rest of the extension can treat them with caution.

This ladder means the adapter never simply fails — it always returns *something* — but it also always tells you **how confident** it was, which method it used for each field (see "Debug information" below).

## What it looks for, one field at a time

### 1. Job title

- First choice: the title from the site's own structured job data.
- Second choice: the page's social-preview title tag.
- Third choice: the largest, most prominent heading visible on the page — picking the one closest to the top if there are several.
- Fourth choice: any element whose styling name suggests it's a job title (developers often name things like "job-title" or "position-title" in their code).
- Last resort: the browser tab's title, split apart at common separators (like a dash, colon, or the word "at"/"chez"), since tab titles are often written as "Job Title – Company Name."

### 2. Company

- First choice: the hiring organization named in the site's structured job data.
- Second choice: the site's own declared name in its social-preview tags.
- Third choice: elements whose styling name suggests "company," "employer," or "organization" — while actively ignoring generic button text that sometimes gets mistaken for a company name, like "Apply Now" or "Save Job."
- Last resort: we guess a company name from the website's own address (for example, a posting hosted at "acme.com" would loosely suggest "Acme"). This is intentionally treated as the weakest possible guess.

### 3. Mandate (the full job description)

- First choice: the description text from the site's structured job data, provided it's substantial (not just a one-line teaser).
- Second choice: a **scoring system** that scans the page's content blocks and rates each one on how "description-like" it looks. A block scores well if it has a healthy amount of text, is organized into paragraphs and bullet points, and its styling name hints at "description" or "responsibilities." It scores poorly if it's mostly links (like a navigation menu), full of buttons and form fields (like page chrome, not prose), or its styling name hints at "sidebar," "footer," "cookie banner," or similar irrelevant content. Whichever block scores highest wins.
  - Once a winning block is found, the adapter double-checks whether a smaller piece *inside* it actually holds all the same content — if so, it narrows down to that smaller, more precise piece rather than grabbing an oversized container that might also include unrelated page furniture like the site header.
- Third choice: generic containers whose styling name or page role suggests "description" or "main content."
- Last resort: the entire visible text of the page, as a maximally safe fallback so a mandate is never completely empty.

### 4. Salary

Separately from the three fields above, the adapter does a dedicated best-effort scan for compensation figures:

- It first looks at lines of text that contain salary-related keywords (in both English and French, e.g. "salary," "salaire," "compensation," "pay rate"), and tries to find a number pattern that looks like money on that same line.
- If that doesn't find anything, it scans the entire page's text for a money-shaped pattern as a broader fallback, recognizing formats like a range in thousands ("80k$ – 100k$"), a range with full numbers ("80 000$ to 100 000$ / year"), or an hourly rate ("25$/h").
- If nothing money-shaped is found anywhere, salary is simply reported as "not found" rather than guessed.

## Why it's built this way

- **Never trust a single method blindly.** Websites are wildly inconsistent, so relying on just one technique (say, only reading the page's `<h1>`) would fail constantly. Falling back through several independent strategies makes the adapter resilient to sites it has never seen before.
- **Prefer machine-readable data over guessing.** Structured job data and metadata are written by the site's own developers specifically to describe the posting accurately — when they exist, they're far more trustworthy than any heuristic we could invent.
- **Score, don't guess blindly, for the hardest field.** The job description is the hardest thing to locate because it's rarely labeled in a standard way. Instead of a single fixed rule, scoring several candidate blocks and picking the best one lets the adapter adapt to very different page layouts.
- **Always return something, and always say how confident you are.** A missing field is worse than a low-confidence field, as long as the extension (or the person using it) can see which method produced it and judge accordingly.
- **Fail gracefully, field by field.** If one piece of logic breaks unexpectedly on a strange page, it doesn't take down the whole extraction — the adapter isolates each field so one failure just means that one field comes back empty instead of crashing everything.

## What comes back out

Every extraction produces:

- The **page's address** it was run on.
- For each of the three fields (title, company, mandate): the **text found**, and, when possible, a **reference to the actual element on the page** it came from (so the extension's interface can highlight or scroll to it — this reference can legitimately be missing even when the text itself was found, particularly when the text came from structured data with no obvious matching visual element).
- The **salary string**, if one was found, otherwise nothing.
- A small **debug summary** noting, for each field, exactly which method in the ladder produced the answer, and whether structured job data was present on the page at all. This is what makes it possible to trust — or double-check — any given result.

## Two ways to run it

- **Immediate**: run the extraction exactly once, right away. This works well on pages whose content is already fully loaded when the extension runs (traditional, server-rendered pages).
- **Wait-and-retry**: repeatedly attempt the extraction for up to a set amount of time, stopping early as soon as a sufficiently long job description has been found. This is the recommended default, because many modern job sites (especially ones built with client-side frameworks) render their content progressively — the page may look empty for a moment even after it has finished loading in the traditional sense.
