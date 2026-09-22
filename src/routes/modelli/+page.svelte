<svelte:head>
  <title>Modello previsionale | Meteo Mediator</title>
  <meta
    name="description"
    content="Mappa modellistica interattiva ECMWF per vento, pioggia e temperatura."
  />
</svelte:head>

<script lang="ts">
  const modelUrl = 'https://www.ilmeteo.net/mappe-meteo/';
  const windyUrl = 'https://embed.windy.com/embed2.html?lat=43.7&lon=10.4&detailLat=43.7&detailLon=10.4&width=650&height=450&zoom=7&level=surface&overlay=wind&product=ecmwf&menu=true&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=true&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1';
</script>

<div class="model-page">
  <header class="model-header">
    <div>
      <p class="eyebrow">Meteo Mediator</p>
      <h1>Modello previsionale</h1>
      <p>
        Mappa interattiva ECMWF per osservare l'evoluzione prevista di vento, pioggia e temperatura.
      </p>
    </div>
    <a class="source-button" href={modelUrl} target="_blank" rel="noreferrer">
      Apri ilMeteo.net
    </a>
  </header>

  <main class="model-panel">
    <div class="panel-bar">
      <h2>Modello ECMWF</h2>
      <span>Previsione modellistica</span>
    </div>
    <div class="model-frame">
      <iframe
        title="Mappa previsionale ECMWF interattiva"
        src={windyUrl}
        loading="lazy"
      ></iframe>
    </div>
  </main>

  <p class="source-note">
    La mappa è un prodotto modellistico: rappresenta una previsione e non una misurazione osservata.
    La fonte interattiva è Windy; per la pagina di mappe modellistiche di riferimento apri ilMeteo.net.
  </p>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #dcecf7;
    color: #183244;
    font-family: Georgia, 'Times New Roman', serif;
  }

  .model-page {
    min-height: 100vh;
    padding: 2rem clamp(1rem, 4vw, 4rem) 3rem;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.78), transparent 42%),
      linear-gradient(180deg, #b8e2f6 0%, #edf8fc 100%);
  }

  .model-header,
  .model-panel,
  .source-note {
    width: min(1180px, 100%);
    margin-inline: auto;
  }

  .model-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    color: #0878b5;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1,
  h2,
  p {
    margin-top: 0;
  }

  h1 {
    margin-bottom: 0.35rem;
    color: #12354a;
    font-size: clamp(2rem, 5vw, 3.5rem);
  }

  .model-header p:last-child {
    max-width: 42rem;
    margin-bottom: 0;
    color: #38566a;
    font-size: 1.05rem;
  }

  .source-button {
    flex: 0 0 auto;
    padding: 0.65rem 0.9rem;
    border: 1px solid #0878b5;
    border-radius: 6px;
    background: #0878b5;
    color: white;
    font: inherit;
    text-decoration: none;
  }

  .model-panel {
    overflow: hidden;
    border: 1px solid rgba(40, 100, 130, 0.22);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.82);
    box-shadow: 0 1rem 2rem rgba(22, 45, 61, 0.12);
  }

  .panel-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.9rem 1rem;
  }

  .panel-bar h2 {
    margin: 0;
    color: #12354a;
    font-size: 1.35rem;
  }

  .panel-bar span {
    color: #527084;
    font-size: 0.9rem;
  }

  .model-frame {
    height: clamp(32rem, 68vw, 48rem);
    border-top: 1px solid rgba(40, 100, 130, 0.18);
    background: #eaf5f9;
  }

  iframe {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .source-note {
    margin-top: 1rem;
    color: #527084;
    font-size: 0.85rem;
  }

  @media (max-width: 700px) {
    .model-page {
      padding: 1.25rem 0.75rem 2rem;
    }

    .model-header {
      align-items: start;
      flex-direction: column;
    }

    .source-button {
      width: 100%;
      box-sizing: border-box;
      text-align: center;
    }

    .panel-bar {
      align-items: start;
      flex-direction: column;
      gap: 0.25rem;
    }

    .model-frame {
      height: 34rem;
    }
  }
</style>
