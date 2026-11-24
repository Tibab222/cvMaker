# Resume templates (`.cvm`)

A resume template is one `.cvm` text file. It decides everything about the look: page size and margins, layout, fonts, colours, which sections appear and in what order. It never holds content: the resume data comes from the profile and from what the user picks in the CV maker.

The built-in templates are in [`src/templates/`](../src/templates). Imported templates are copied to `<userData>/templates/<id>.cvm`. The gallery has an **Open templates folder** button for that folder.

The quickest way to make a template is to download a built-in one from the gallery (the ⬇ button on its card), edit it, then import it back with **Import .cvm**.

## File structure

```html
<cvm version="1">
<meta>
{ JSON: name, page size, options }
</meta>

<template>
HTML with Handlebars syntax
</template>

<style>
CSS
</style>
</cvm>
```

The three parts are all you need. The `<template>` part may contain the word `<style>`: its content runs up to the last `</template>`.

## `<meta>`

```json
{
  "id": "ats-classic",
  "name": "ATS Classic",
  "description": "Shown in the gallery.",
  "author": "You",
  "version": "1.0.0",
  "page": { "size": "Letter", "margin": "11mm 14mm" },
  "vars": { "accent": "#2563eb" },
  "collections": {
    "appendix": { "source": "projects", "label": "Appendix", "bullets": "all" }
  },
  "i18n": {
    "en": { "stack": "Tech stack" },
    "fr": { "stack": "Technos" }
  }
}
```

| Key | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Lowercase letters, digits and `-`. An imported template with the same id as one you already imported replaces it. The built-in ids (`classic`, `ats-classic`, `modern-sidebar`, `elegant`) cannot be used. |
| `name` | yes | Shown in the toolbar button and the gallery. |
| `description`, `author`, `version` | no | Shown in the gallery. |
| `page.size` | no | `"A4"` (default) or `"Letter"`. |
| `page.margin` | no | CSS margin shorthand in absolute units (`mm`, `cm`, `in`, `pt`, `px`), e.g. `"15mm"` or `"11mm 14mm"`. Defaults to `15mm`. The PDF uses it on every page, and the editor preview uses it as padding. |
| `vars` | no | CSS custom properties set on the resume: `"accent": "#2563eb"` gives you `var(--accent)`. Values cannot contain `; { } < >` or `url(`. |
| `collections` | no | Extra lists the user picks for this template (see [Collections](#collections)). |
| `i18n` | no | Labels by language, read with `{{t "key"}}`. They override the built-in labels. |

## `<template>`

This is [Handlebars](https://handlebarsjs.com/guide/) (`{{value}}`, `{{#if}}`, `{{#each}}`, `{{#unless}}`, `{{else}}`, `@first`, `@last`, `@index`, `../`), plus the cvMaker helpers below. Values are HTML-escaped. The HTML is sanitized after rendering (see [Limits](#limits)).

### Data

Lists contain only what the user selected for this resume, in the order they chose.

| Name | Content |
| --- | --- |
| `profile` | `firstName`, `lastName`, `mail`, `phone`, `portfolio`, `linkedin`, `github`, …, `location`, `customLinks`, `language`. |
| `header` | What the resume shows in its header: `header.title` (the headline under the name), plus the on/off flags of each contact. |
| `contacts` | The contacts the resume shows, already ordered and formatted: `{ key, label, url }`. `key` is `mail`, `phone`, `portfolio`, `linkedin`, `github`, `twitter`, … or `link` for custom links. `url` is ready for `href` (`mailto:`, `tel:`, `https://`). |
| `photo` | The profile photo as a data URL, only when the resume includes it: `{{#if photo}}<img src="{{photo}}">{{/if}}`. |
| `summary` | The summary sentences (strings). Empty when the summary is hidden. While the user is writing it, it can contain empty sentences, so `{{#if summary}}` stays true and the editor shows. Display it with `{{editSummary}}`. |
| `experiences` | `jobTitle`, `company`, `location`, `startDate`, `endDate` (a date or `"Present"`), `description` (one bullet per line). |
| `projects` | `title`, `subtitle`, `link`, `startDate`, `endDate`, `useCase`, `stack` (list), plus: `bullets` (the bullets picked for this resume, each `{ text, tags }`), `allBullets`, `tags` (every tag on its bullets, a good fallback for `stack`), `company` (from the related experience), and `showCompany` (true when the subtitle does not already name the company). Projects with no picked bullet are left out. |
| `skills` | `name`, `proficiency`, `category`. |
| `education` | `degree`, `institution`, `location`, `startDate`, `endDate`, `description`, `kind` (`degree`, `certification`, `course`). Ongoing first, then the most recent. |
| `all.experiences`, `all.projects`, `all.skills`, `all.education` | The whole profile, selected or not. |
| `<collection name>` | Each collection declared in meta, e.g. `appendix`. Also available as `collections.appendix`. |
| `lang` | `"en"` or `"fr"`: the resume language. |
| `meta`, `page` | The template's own meta and page settings. |

Entities are passed whole: a field added to the profile later (see [Adding information](#adding-information-to-the-profile)) can be read straight away, as `{{teamSize}}` inside `{{#each experiences}}`.

Edits the user makes on the resume itself (clicking a text) are already applied to these values.

### Editable text

Text written with `{{edit}}` can be clicked in the editor to change it on this resume only. The AI rewrite and the "reset" button work on it too. Plain `{{value}}` is read-only on the resume. Use `{{edit}}` for any text someone may want to reword for an application.

```handlebars
{{#each experiences}}
  <h3>{{edit this "jobTitle"}}</h3>
  {{edit this "description" display="bullets"}}
{{/each}}

{{#each projects}}
  {{#each bullets}}<li>{{edit this "text"}}</li>{{/each}}
{{/each}}

<h2>{{edit "experience:section" "title" (t "experience")}}</h2>
```

- **`{{edit this "field"}}`**: a field of the current item (`experiences`, `projects`, their `bullets`, `skills`, `education`, and the same in collections and `all`).
- **`{{edit "type:id" "field" defaultText}}`**: free text that does not come from the profile, such as section titles. The pair `"type:id"` plus the field name is the key the edit is saved under, so keep it stable across versions of your template. The built-in templates use `experience:section`, `project:section`, `education:section`, `section:skills` and `section:summary`, so a user's renamed titles carry over when they switch template.
- Options:
  - `display="text"` (default): one line.
  - `display="bullets"`: one `<li>` per line inside `<ul class="cv-bullets">`.
  - `display="lines"`: one line per line, separated by `<br>`.
  - `multiline=true`: several lines rendered as typed.
  - `placeholder="…"`: text shown in the editor when the field is empty.
  - `class="…"`: a class added to the field.

**`{{editSummary}}`** shows the summary with its editor (add, move and delete bullets). `{{editSummary style="paragraph"}}` shows it as one paragraph. Wrap it in `{{#if summary}}` to hide the section when the summary is off. Put `{{editSummary}}` in its own element (e.g. its `<section>`): while the summary has no text yet, that element is left out of the PDF, so its title doesn't print alone.

Text typed as `**bold**` in the app shows in bold, both in `{{edit}}` and with `{{fmt}}`.

### Helpers

| Helper | Example | Result |
| --- | --- | --- |
| `t` | `{{t "experience"}}` | Label in the resume language. |
| `date` | `{{date startDate "MMM yyyy"}}` | A [date-fns pattern](https://date-fns.org/docs/format). `"Present"` is translated, and a bare year is kept as is. |
| `period` | `{{period startDate endDate "MMM yyyy" sep=" – "}}` | `Apr 2024 – Mar 2026`, `2023`, `2024 – Present`. |
| `year` | `{{year endDate}}` | `2026` |
| `future` | `{{#if (future endDate)}}({{t "expected"}}){{/if}}` | True when the date is after today. |
| `upper`, `lower`, `capitalize` | `{{upper profile.lastName}}` | |
| `fmt` | `{{fmt useCase}}` | Text with `**bold**` rendered. |
| `shortUrl` | `{{shortUrl link}}` | `https://www.site.com/a/` → `site.com/a` |
| `href` | `<a href="{{href link}}">` | Adds `https://` when the link has no protocol. |
| `join` | `{{join stack ", "}}`, `{{join items ", " "name"}}` | Joins a list, or one field of a list of objects. Empty values are skipped. |
| `groupBy` | `{{#each (groupBy skills "category")}}{{key}}: {{join items ", " "name"}}{{/each}}` | Groups in first-seen order. Items without the field go in `fallback="…"` (default: the "Other" label). `fallback=""` leaves the key empty. |
| `where`, `whereNot` | `{{#each (where education "kind" "certification")}}` | Items whose field equals, or does not equal, the value. |
| `limit` | `{{#each (limit projects 3)}}` | The first N items. |
| `lines` | `{{#each (lines description)}}<li>{{this}}</li>{{/each}}` | One item per line, without the typed bullet characters. |
| `count` | `{{count projects}}` | |
| `eq`, `ne`, `gt`, `lt` | `{{#if (eq key "phone")}}` | |
| `and`, `or`, `not` | `{{#if (or header.title profile.location)}}` | An empty list counts as false. `or` returns the first true value. |
| `default` | `{{default subtitle "—"}}` | The first non-empty value. |
| `concat` | `{{concat "a" b}}` | |
| `icon` | `{{icon "mail" 12 stroke=2}}` | An inline SVG icon (class `cv-icon`) that takes the CSS `color`. Available names: `mail`, `phone`, `portfolio`, `globe`, `linkedin`, `github`, `twitter`, `instagram`, `tiktok`, `youtube`, `facebook`, `link`, `location`, `calendar`, `experience`, `education`, `projects`, `skills`, `languages`, `summary`, `certification`, `sparkles`. `{{icon key}}` inside `{{#each contacts}}` gives the icon of each contact. |
| `pageBreak` | `{{pageBreak}}` | The next content starts on a new page. The editor shows the break too. |

Built-in label keys for `{{t}}`:
- `summary`, `skills`, `technicalSkills`, `experience`, `projects`, `selectedProjects`, `education`, `educationCertifications`, `certifications`, `projectAppendix`;
- `contact`, `languages`, `other`, `present`, `expected`, `inProgress`, `useCase`, `stack`.

Add your own keys in `meta.i18n`.

### Collections

A collection asks the user for a second selection that only this template uses: a project appendix, or a "Key achievements" list of experiences. Each collection becomes a tab in the resume picker, and the template reads it under its name:

```json
"collections": {
  "appendix": { "source": "projects", "label": "Appendix", "bullets": "all" }
}
```

```handlebars
{{#if appendix}}
  {{pageBreak}}
  <h2>{{edit "section:appendix" "title" (t "projectAppendix")}}</h2>
  {{#each appendix}}
    <h3>{{edit this "title"}}</h3>
    {{#if useCase}}<p><b>{{t "useCase"}}:</b> {{fmt useCase}}</p>{{/if}}
    <p><b>{{t "stack"}}:</b> {{#if stack}}{{join stack ", "}}{{else}}{{join tags ", "}}{{/if}}</p>
  {{/each}}
{{/if}}
```

- `source`: `projects`, `experiences`, `education` or `skills`.
- `label`: the tab name.
- `bullets` (projects only): `"all"` (default) shows every bullet of the project; `"selected"` shows only the bullets picked for the resume.
- A collection name cannot reuse a name of the data above (`projects`, `skills`, `all`, …).

## `<style>`

Plain CSS. It only styles this template: everything is wrapped in `@scope`, so you can write `h1`, `section` or `.title` freely.

- `html`, `body` and `:root` mean the resume page itself. Put the base font, size and colour there.
- `var(--name)` reads the `vars` of the meta.
- Page size and margins come from `meta.page`, so `@page` rules are ignored.
- `break-before: page`, `break-inside: avoid` and the other print properties apply to the PDF.
- Fonts:
  - **Embedded fonts** (`@font-face` with a `data:font/woff2;base64,…` URL) work everywhere and are the only way to be sure of the look on other computers.
  - **Fonts installed on the computer** also work. List fallbacks: `font-family: "Inter", "Segoe UI", Arial, sans-serif;`.
- Images must be embedded as `data:image/…` URLs.

The editor adds `cv-field` to editable texts, `cv-bullets` to bullet lists and `cv-summary` to the summary. Style `.cv-bullets` to style every bullet list at once.

## Limits

Imported templates are treated as untrusted, so:
- no scripts, frames, forms, video/audio, `<link>` or `<meta>`;
- nothing is loaded from the network: external `url()`, `@import`, `src` and `srcset` are removed; only `data:` images and fonts remain;
- links (`<a href>`) are kept for the PDF, but clicking them in the editor does nothing.

Other limits:
- a template file can be up to 3 MB;
- a template that fails to load is listed in the gallery with the reason;
- a template with a Handlebars error shows the error in place of the resume.

## Adding information to the profile

To give templates a new piece of information, such as a "team size" on experiences:

1. Add the optional property to the entity interface in `shared/` (e.g. `teamSize?: string` in `Experience.interface.ts`).
2. Declare it in `EXTRA_FIELDS` in [`shared/profileFields.ts`](../shared/profileFields.ts), with a label and a type (`text`, `textarea`, `location`, `tags`, `select`).

The field then appears in the profile editor of that section, and every template can read it (`{{teamSize}}`). Nothing else needs to change.

## Adding a helper

Register it in `registerHelpers()` in [`src/cvm/engine.ts`](../src/cvm/engine.ts) and add a line to the helper table above. Helpers must return escaped text, or an `hb.SafeString` built only from escaped parts. The sanitizer runs afterwards anyway.

## Adding a built-in template

Drop a `.cvm` file in [`src/templates/`](../src/templates). It is picked up automatically. Add its id to `ORDER` in [`src/cvm/builtins.ts`](../src/cvm/builtins.ts) to choose where it appears in the gallery.
