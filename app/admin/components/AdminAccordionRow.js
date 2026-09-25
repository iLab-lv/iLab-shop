'use client';

import { isAccordionActivationKey } from '../../../lib/adminEditingState.mjs';
import styles from './AdminEditing.module.css';

const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, [role="button"], [data-accordion-ignore]';

function comesFromIndependentControl(event) {
  const control = event.target.closest?.(INTERACTIVE_SELECTOR);
  return control && control !== event.currentTarget;
}

export default function AdminAccordionRow({
  id,
  expanded,
  onToggle,
  summary,
  children,
  disabled = false,
  ariaLabel,
  className = '',
  interactiveSummary = true,
  leadingControl = null,
}) {
  const summaryId = `${id}-summary`;
  const panelId = `${id}-editor`;

  function activate(event) {
    if (disabled || comesFromIndependentControl(event)) return;
    onToggle?.();
  }

  function handleKeyDown(event) {
    if (!isAccordionActivationKey(event.key) || comesFromIndependentControl(event)) return;
    event.preventDefault();
    activate(event);
  }

  return (
    <section className={`${styles.accordion} ${expanded ? styles.accordionExpanded : ''} ${className}`}>
      <div id={interactiveSummary ? undefined : summaryId} className={styles.accordionSummary}>
        {leadingControl}
        {interactiveSummary ? <button id={summaryId} type="button" className={styles.accordionToggle} disabled={disabled}
          aria-label={ariaLabel} aria-expanded={expanded} aria-controls={panelId}
          onClick={activate} onKeyDown={handleKeyDown}>
          <span className={styles.accordionSummaryContent}>{summary}</span>
          <span className={styles.accordionChevron} aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </button> : <div className={styles.accordionSummaryContent}>{summary}</div>}
      </div>
      {expanded ? <div className={styles.accordionPanel} id={panelId} role="region" aria-labelledby={summaryId}>
        <div className={styles.accordionPanelInner}>{children}</div>
      </div> : null}
    </section>
  );
}
