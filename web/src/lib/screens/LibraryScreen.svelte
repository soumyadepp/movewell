<script lang="ts">
  import Pictogram from "../components/Pictogram.svelte";
  import { href } from "../controller.svelte";
  import { ViewMode } from "../domain/models";
  import { EXERCISES, POSTURE_LABEL } from "../exercises";
  import { POSTURE_ILLUSTRATION } from "../illustrations";
  import * as msg from "../messages";
</script>

<div class="library">
  <header>
    <h1>{msg.LIBRARY_TITLE}</h1>
    <p class="lead">{msg.LIBRARY_LEAD}</p>
  </header>

  <ul class="grid">
    {#each EXERCISES as exercise (exercise.mode)}
      {@const copy = exercise.copy}
      <li>
        <a class="item card" href={href.detail(exercise.mode)}>
          <div class="figure" aria-hidden="true">
            <Pictogram illustration={exercise.illustration} label="" animate={false} size={96} />
          </div>
          <div class="text">
            <h2>{copy.label}</h2>
            <p>{copy.summary}</p>
            <span class="view">{exercise.bestView === ViewMode.Side ? msg.VIEW_SIDE_LABEL : msg.VIEW_FRONT_LABEL}</span>
          </div>
        </a>
      </li>
    {/each}
    <li>
      <a class="item card" href={href.posture}>
        <div class="figure" aria-hidden="true">
          <Pictogram illustration={POSTURE_ILLUSTRATION} label="" animate={false} size={96} />
        </div>
        <div class="text">
          <h2>{POSTURE_LABEL}</h2>
          <p>{msg.POSTURE_SUMMARY}</p>
          <span class="view">{msg.VIEW_FRONT_LABEL}</span>
        </div>
      </a>
    </li>
  </ul>
</div>

<style>
  .library {
    display: grid;
    gap: var(--space-6);
  }

  h1 {
    font-size: var(--font-size-4xl);
  }

  .lead {
    margin: var(--space-2) 0 0;
    max-width: 44rem;
    color: var(--color-text-muted);
    font-size: var(--font-size-lg);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(22rem, 1fr));
    gap: var(--space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .item {
    display: flex;
    gap: var(--space-5);
    align-items: center;
    height: 100%;
    color: var(--color-text);
    text-decoration: none;
    transition: border-color var(--duration-fast) var(--easing-standard);
  }

  .item:hover {
    border-color: var(--color-primary);
  }

  .figure {
    flex: none;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--color-primary-subtle);
  }

  h2 {
    font-size: var(--font-size-xl);
  }

  .text p {
    margin: var(--space-1) 0 var(--space-3);
    color: var(--color-text-muted);
  }

  .view {
    display: inline-block;
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-full);
    background: var(--color-surface-sunken);
    border: 1px solid var(--color-border);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
