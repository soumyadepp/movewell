<script lang="ts">
  import ComfortSettings from "../components/ComfortSettings.svelte";
  import type { CoachController } from "../controller.svelte";
  import { href } from "../controller.svelte";
  import * as msg from "../messages";

  let { coach }: { coach: CoachController } = $props();
</script>

<div class="container page">
  <h1>{msg.COMFORT_TITLE}</h1>
  <p class="lead secondary intro">{msg.COMFORT_LEAD}</p>
  <ComfortSettings {coach} sample />
  <div class="actions">
    <a class="link" href={href.setup("welcome")}>← {msg.BACK}</a>
    <a class="btn btn-primary" href={href.setup("space")}>{msg.CONTINUE}</a>
  </div>
</div>

<style>
  .page {
    max-width: 56rem;
    padding-top: var(--space-14);
    padding-bottom: var(--space-14);
  }

  .intro {
    margin: var(--space-3) 0 var(--space-6);
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--space-10);
  }

  .actions .btn {
    min-width: 16rem;
  }
</style>
