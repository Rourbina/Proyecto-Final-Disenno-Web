(function(){
  const form   = document.getElementById('formContacto');
  const nacInp = document.getElementById('nacimiento');
  const edad   = document.getElementById('edad');
  const errGenero = document.getElementById('errGenero');
  const errGrado  = document.getElementById('errGrado');

  function calcEdad(){
    const v = nacInp.value;
    if(!v) return;
    const n = new Date(v);
    const h = new Date();
    let e = h.getFullYear() - n.getFullYear();
    const m = h.getMonth() - n.getMonth();
    if(m < 0 || (m === 0 && h.getDate() < n.getDate())) e--;
    edad.value = e;
  }
  nacInp.addEventListener('change', calcEdad);
  calcEdad();

  form.addEventListener('submit', (ev)=>{
    // HTML5 básico
    if(!form.checkValidity()){
      ev.preventDefault();
      ev.stopPropagation();
    }

    // Reglas custom: género (un radio)
    const generoOK = !!form.querySelector('input[name="genero"]:checked');
    errGenero.style.display = generoOK ? 'none' : 'block';

    // Reglas custom: grado (al menos un checkbox)
    const gradoOK = !!form.querySelector('input[name="grado"]:checked');
    errGrado.style.display = gradoOK ? 'none' : 'block';

    if(!generoOK || !gradoOK){
      ev.preventDefault();
      ev.stopPropagation();
    }

    form.classList.add('was-validated');
  });
})();
