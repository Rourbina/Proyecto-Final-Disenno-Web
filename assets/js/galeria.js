const { createApp, computed } = Vue;

createApp({
  data(){
    return {
      imgs: [],
      filtro: 'todos',
      cargando: true,
      error: ''
    };
  },
  computed:{
    categorias(){
      const cats = new Set(this.imgs.map(i => i.cat).filter(Boolean));
      return Array.from(cats);
    },
    filtradas(){
      return this.filtro === 'todos'
        ? this.imgs
        : this.imgs.filter(i => i.cat === this.filtro);
    }
  },
  mounted(){
    const DATA_BASE = 'https://rourbina.github.io/chef-francis-data/';
    fetch(`${DATA_BASE}galeria.json?v=1`)
      .then(r => r.json())
      .then(d => {
        // Normaliza rutas a absolutas y agrega alt por accesibilidad
        this.imgs = Array.isArray(d)
          ? d.map(it => {
              const raw = (it.src || it.img || '').trim();
              const src = raw.startsWith('http') ? raw : DATA_BASE + raw.replace(/^\.\//, '');
              return { ...it, src, alt: it.alt || it.cat || 'Imagen de la galería' };
            })
          : [];
      })
      .catch(err => {
        console.error('No se pudo cargar galeria.json', err);
        this.error = 'No se pudo cargar la galería.';
      })
      .finally(() => this.cargando = false);
  }
}).mount('#appGaleria');
