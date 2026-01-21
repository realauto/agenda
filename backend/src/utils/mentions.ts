const MENTION_REGEX = /@(\w+)/g;

export function extractMentions(content: string): string[] {
  const matches = content.match(MENTION_REGEX);
  if (!matches) return [];

  return [...new Set(matches.map((m) => m.slice(1)))];
}

export function contentToHtml(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(MENTION_REGEX, '<span class="mention">@$1</span>')
    .replace(/\n/g, '<br>');
}
