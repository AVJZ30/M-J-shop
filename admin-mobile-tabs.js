/* Navegación de las cuatro secciones para computadora y celular.
   Se reutilizan los nodos originales: los formularios, botones y eventos
   mantienen exactamente su funcionamiento. */
(() => {
  const tabs = document.getElementById('adminMobileTabs');
  const host = document.getElementById('adminMobileContent');
  if (!tabs || !host) return;

  const sections = [
    { id: 'catalog', selector: '#adminList' },
    { id: 'sale', selector: '#saleForm' },
    { id: 'sold', selector: '#soldProductsAdmin' },
    { id: 'categories', selector: '#categoryForm' }
  ].map(item => {
    const element = document.querySelector(item.selector);
    const node = element?.closest('section');
    return node ? { ...item, node } : null;
  });

  if (sections.some(section => !section)) return;

  // Mover las secciones bajo el menú sin clonarlas ni modificar sus datos.
  for (const section of sections) host.appendChild(section.node);
  const buttons = [...tabs.querySelectorAll('[data-admin-section]')];
  let selected = '';

  function setSelected(id) {
    selected = id;
    for (const section of sections) section.node.hidden = section.id !== id;
    host.hidden = !id;

    for (const button of buttons) {
      const active = button.dataset.adminSection === id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-expanded', String(active));
      button.setAttribute('aria-pressed', String(active));
    }
  }

  document.body.classList.add('admin-mobile-tabs-enabled');
  tabs.hidden = false;
  setSelected('');

  tabs.addEventListener('click', event => {
    const button = event.target.closest('[data-admin-section]');
    if (!button) return;
    const next = selected === button.dataset.adminSection ? '' : button.dataset.adminSection;
    setSelected(next);
  });
})();
