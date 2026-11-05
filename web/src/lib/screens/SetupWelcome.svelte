<script lang="ts">
  import { untrack } from "svelte";
  import type { CoachController } from "../controller.svelte";
  import { href } from "../routing";
  import * as msg from "../messages";

  let { coach }: { coach: CoachController } = $props();
  let name = $state(untrack(() => coach.name));

  function next(event: SubmitEvent) {
    event.preventDefault();
    coach.setName(name);
    coach.navigate(href.setup("comfort"));
  }
</script>

<div class="split">
  <section class="panel">
    <div class="panel-text">
      <h1>{msg.WELCOME_TITLE}</h1>
      <p class="lead">{msg.WELCOME_BODY}</p>
    </div>
    <img class="panel-photo" src="{import.meta.env.BASE_URL}img/welcome.webp" alt="" />
  </section>

  <form class="form" onsubmit={next}>
    <label for="name" class="label">{msg.WELCOME_NAME_LABEL}</label>
    <p class="secondary small">{msg.WELCOME_NAME_HINT}</p>
    <!-- svelte-ignore a11y_autofocus -->
    <input id="name" bind:value={name} autocomplete="given-name" autofocus maxlength="40" />
    <button class="btn btn-primary btn-block" type="submit">{msg.CONTINUE}</button>
    <p class="secondary small privacy">{msg.WELCOME_PRIVACY}</p>
  </form>
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    min-height: calc(100vh - var(--header-height));
  }

  .panel {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: var(--space-10);
    padding: var(--space-14) var(--gutter) 0;
    background: var(--color-primary);
    color: var(--color-on-deep);
  }

  .panel-text {
    display: grid;
    gap: var(--space-6);
    max-width: 34rem;
  }

  h1 {
    color: var(--color-on-deep);
  }

  .panel-photo {
    width: 100%;
    max-height: 52vh;
    object-fit: cover;
    border-radius: var(--photo-radius) var(--photo-radius) 0 0;
  }

  .form {
    align-self: center;
    display: grid;
    gap: var(--space-4);
    width: min(32rem, 100% - 2 * var(--gutter));
    margin: var(--space-12) auto;
  }

  .label {
    font-family: var(--font-display);
    font-size: var(--type-title);
    font-weight: var(--weight-semibold);
    letter-spacing: -0.02em;
  }

  input {
    min-height: var(--control-height);
    padding: 0 var(--space-5);
    border: 2px solid var(--color-rule);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    font: var(--weight-medium) var(--type-body) / 1.2 var(--font-text);
  }

  input:focus {
    border-color: var(--color-primary);
  }

  .privacy {
    margin-top: var(--space-2);
  }

  @media (max-width: 900px) {
    .split {
      grid-template-columns: 1fr;
    }

    .panel-photo {
      max-height: 32vh;
    }
  }
</style>
