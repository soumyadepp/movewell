<script lang="ts">
  import ExerciseMedia from "../components/ExerciseMedia.svelte";
  import { href } from "../routing";
  import { EXERCISES } from "../exercises";
  import * as msg from "../messages";
</script>

<div class="container page">
  <h1>{msg.EXERCISES_TITLE}</h1>
  <p class="lead secondary intro">{msg.EXERCISES_LEAD}</p>
  <ul class="list">
    {#each EXERCISES as exercise, i (exercise.mode)}
      <li class="enter" style:--i={i + 1}>
        <a class="row" href={href.detail(exercise.mode)}>
          <div class="thumb"><ExerciseMedia {exercise} animate={false} /></div>
          <div class="text">
            <h2>{exercise.copy.label}</h2>
            <p>{exercise.copy.benefit}</p>
            <p class="secondary small">{msg.VIEW_HINT(exercise.bestView)}</p>
          </div>
        </a>
      </li>
    {/each}
  </ul>
</div>

<style>
  .page {
    padding-top: var(--space-14);
    padding-bottom: var(--space-14);
  }

  .intro {
    margin: var(--space-3) 0 var(--space-8);
  }

  .list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: var(--space-12);
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--color-rule);
  }

  li {
    border-bottom: 1px solid var(--color-rule);
  }

  .row {
    display: flex;
    gap: var(--space-6);
    align-items: center;
    padding: var(--space-6) 0;
    color: var(--color-text);
    text-decoration: none;
  }

  .row:hover h2 {
    text-decoration: underline;
    text-underline-offset: 6px;
  }

  .thumb {
    flex: none;
    width: 200px;
  }

  .text {
    display: grid;
    gap: var(--space-2);
    min-width: 0;
  }

  h2 {
    font-size: calc(28px * var(--text-scale));
  }

  @media (max-width: 1000px) {
    .list {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .thumb {
      width: 120px;
    }
  }
</style>
