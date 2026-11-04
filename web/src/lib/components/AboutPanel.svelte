<script lang="ts">
  import * as msg from "../messages";

  let {
    totalSessions,
    onDownload,
    onClear,
  }: { totalSessions: number; onDownload: () => void; onClear: () => void } = $props();
</script>

<details class="panel">
  <summary>{msg.ABOUT_TITLE}</summary>
  <p>{msg.ABOUT_BODY}</p>
  <p class="keys">{msg.SHORTCUTS}</p>
  <div class="actions">
    <button class="btn" onclick={onDownload} disabled={totalSessions === 0}>{msg.DOWNLOAD_CSV}</button>
    <button class="btn" onclick={onClear} disabled={totalSessions === 0}>{msg.CLEAR_HISTORY}</button>
  </div>
</details>

<style>
  .panel {
    padding: 1rem 1.5rem;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-card);
  }

  summary {
    cursor: pointer;
    font-weight: 600;
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  p {
    color: var(--muted);
    margin: 0.75rem 0 0;
    max-width: 70ch;
  }

  .keys {
    font-size: 0.875rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }
</style>
