import { activities } from './activities/index.js';
import { escapeHtml, uid } from './utils.js';

const baseStyles = (containerId) => `
  #${containerId} {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #0f172a;
    line-height: 1.5;
    display: grid;
    gap: 1rem;
  }
  #${containerId} *,
  #${containerId} *::before,
  #${containerId} *::after {
    box-sizing: border-box;
  }
  #${containerId} .cd-embed-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }
  #${containerId} .cd-embed-description {
    margin: 0;
    color: rgba(15, 23, 42, 0.7);
  }
`;

export const generateEmbed = ({ type, title, description, data }) => {
  const activity = activities[type];
  if (!activity) {
    throw new Error('Unknown activity type');
  }

  const containerId = `cd-embed-${uid('activity')}`;
  const parts = activity.embedTemplate(data, containerId);
  const heading = title ? `<h2 class="cd-embed-title">${escapeHtml(title)}</h2>` : '';
  const desc = description
    ? `<p class="cd-embed-description">${escapeHtml(description)}</p>`
    : '';

  return `<!-- Canvas Designer Studio embed: ${escapeHtml(title || activity.label)} -->
<div id="${containerId}" class="cd-embed cd-embed-${escapeHtml(type)}" data-activity="${escapeHtml(type)}">
  ${heading}
  ${desc}
  ${parts.html}
</div>
<style>
${baseStyles(containerId)}
${parts.css}
</style>
<script>
${parts.js}
</script>`;
};
