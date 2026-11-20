/**
 * Turns a fixed piece of our own markup (an SVG icon) into nodes without innerHTML.
 * Firefox's review flags innerHTML; DOMParser builds an inert document that runs nothing.
 */
export function fromMarkup(markup: string): DocumentFragment {
  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(parsed.body.childNodes, (node) => document.importNode(node, true)));
  return fragment;
}
