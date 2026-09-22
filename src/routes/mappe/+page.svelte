<svelte:head>
  <title>Mappe meteo | Meteo Mediator</title>
  <meta
    name="description"
    content="Immagini Meteosat e radar predittivo ufficiali MeteoAM."
  />
</svelte:head>

<script lang="ts">
  const satelliteUrl = 'https://www.meteoam.it/it/meteosat';
  const radarUrl = 'https://www.meteoam.it/it/pagina-mappa-radar-predittivo';

  let satelliteKey = $state(Date.now());
  let radarKey = $state(Date.now());

  function refreshMaps(): void {
    satelliteKey = Date.now();
    radarKey = Date.now();
  }
</script>

<div class="maps-page">
  <header class="maps-header">
    <div>
      <h1>Mappe meteo</h1>
    </div>
    <button type="button" class="refresh-button" onclick={refreshMaps}>Aggiorna</button>
  </header>

  <main class="map-grid">
    <section class="map-panel">
      <div class="panel-heading">
        <div>
          <h2>Meteosat</h2>
        </div>
        <a href={satelliteUrl} target="_blank" rel="noreferrer">Apri fonte</a>
      </div>
      <div class="map-frame">
        <iframe
          title="Meteosat MeteoAM"
          src={`${satelliteUrl}?embedded=${satelliteKey}`}
          loading="lazy"
        ></iframe>
      </div>
    </section>

    <section class="map-panel">
      <div class="panel-heading">
        <div>
          <h2>Radar predittivo</h2>
        </div>
        <a href={radarUrl} target="_blank" rel="noreferrer">Apri fonte</a>
      </div>
      <div class="map-frame">
        <iframe
          title="Radar predittivo MeteoAM"
          src={`${radarUrl}?embedded=${radarKey}`}
          loading="lazy"
        ></iframe>
      </div>
    </section>
  </main>

  <p class="source-note">
    Le mappe sono fornite da <a href="https://www.meteoam.it/" target="_blank" rel="noreferrer">MeteoAM</a>
    e possono avere tempi di aggiornamento diversi dalle previsioni orarie.
  </p>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #dcecf7;
    color: #183244;
    font-family: Georgia, 'Times New Roman', serif;
  }

  .maps-page {
    min-height: 100vh;
    padding: 2rem clamp(1rem, 4vw, 4rem) 3rem;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.78), transparent 42%),
      linear-gradient(180deg, #b8e2f6 0%, #edf8fc 100%);
  }

  .maps-header,
  .map-grid,
  .source-note {
    width: min(1180px, 100%);
    margin-inline: auto;
  }

  .maps-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
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

  .refresh-button,
  .panel-heading a {
    border: 1px solid #0878b5;
    border-radius: 6px;
    background: #0878b5;
    color: white;
    cursor: pointer;
    font: inherit;
    text-decoration: none;
  }

  .refresh-button {
    flex: 0 0 auto;
    padding: 0.65rem 0.9rem;
  }

  .map-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
  }

  .map-panel {
    overflow: hidden;
    border: 1px solid rgba(40, 100, 130, 0.22);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.82);
    box-shadow: 0 1rem 2rem rgba(22, 45, 61, 0.12);
  }

  .panel-heading {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1rem 0.85rem;
  }

  .panel-heading h2 {
    margin-bottom: 0.25rem;
    color: #12354a;
    font-size: 1.35rem;
  }

  .panel-heading a {
    flex: 0 0 auto;
    padding: 0.45rem 0.65rem;
    font-size: 0.8rem;
  }

  .map-frame {
    height: clamp(25rem, 55vw, 38rem);
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

  .source-note a {
    color: #0878b5;
  }

  @media (max-width: 800px) {
    .maps-page {
      padding: 1.25rem 0.75rem 2rem;
    }

    .maps-header {
      align-items: start;
      flex-direction: column;
    }

    .refresh-button {
      width: 100%;
    }

    .map-grid {
      grid-template-columns: 1fr;
    }

    .map-frame {
      height: 30rem;
    }
  }
</style>
