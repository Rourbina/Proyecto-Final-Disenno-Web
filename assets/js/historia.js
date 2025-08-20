const { createApp, computed } = Vue;

createApp({
  data() {
    return {
      cargando: true,
      intro: null,
      timeline: [],
      mision: '',
      vision: '',
      objetivos: [],
      valores: []
    };
  },
  computed: {
    historiaOrdenada() {
      const conAnio = this.timeline
        .filter(i => /^\d{4}$/.test(i.anio))
        .sort((a, b) => Number(a.anio) - Number(b.anio));
      const otros = this.timeline.filter(i => !/^\d{4}$/.test(i.anio));
      return [...conAnio, ...otros];
    }
  },
  mounted() {
    // Si en el futuro el JSON incluye imágenes relativas, usa este base:
    // const DATA_BASE = 'https://rourbina.github.io/chef-francis-data/';
    const URL_HISTORIA = 'https://rourbina.github.io/chef-francis-data/historia.json?v=2';

    fetch(URL_HISTORIA)
      .then(r => r.json())
      .then(d => {
        // Soporta dos formatos:
        // 1) Objeto: { intro, timeline, mision, vision, objetivos, valores }
        // 2) Array simple: [ { anio, titulo, descripcion }, ... ]
        if (Array.isArray(d)) {
          this.intro = null;
          this.timeline = d;
          this.mision = '';
          this.vision = '';
          this.objetivos = [];
          this.valores = [];
        } else if (d && typeof d === 'object') {
          this.intro = d.intro ?? null;
          this.timeline = d.timeline ?? [];
          this.mision = d.mision ?? '';
          this.vision = d.vision ?? '';
          this.objetivos = Array.isArray(d.objetivos) ? d.objetivos : [];
          this.valores = Array.isArray(d.valores) ? d.valores : [];
        } else {
          throw new Error('Formato de JSON no reconocido');
        }
      })
      .catch((err) => {
        console.error('Error cargando historia:', err);
        this.timeline = [{
          anio: '—',
          titulo: 'No fue posible cargar la historia',
          descripcion: 'Verifica la URL del JSON externo y su formato.'
        }];
      })
      .finally(() => this.cargando = false);
  }
}).mount('#appHistoria');
