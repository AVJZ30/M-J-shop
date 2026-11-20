/* Menú compacto de administración para celulares.
   Reutiliza los mismos formularios y listas; no crea copias ni altera sus eventos. */
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
    if (!node) return null;
    const marker = document.createComment('Posición original: ' + item.id);
    node.parentNode.insertBefore(marker, node);
    return { ...item, node, marker };
  });

  if (sections.some(section => !section)) return;

  const media = window.matchMedia('(max-width: 800px)');
  const buttons = [...tabs.querySelectorAll('[data-admin-section]')];
  let mobileActive = false;
  let selected = '';

  function setSelected(id) {
    selected = id;
    for (const section of sections) section.node.hidden = section.id !== selected;
    host.hidden = !selected;
    for (const button of buttons) {
      const active = button.dataset.adminSection === selected;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-expanded', String(active));
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function applyLayout() {
    if (media.matches) {
      if (!mobileActive) {
        for (const section of sections) host.appendChild(section.node);
        mobileActive = true;
      }
      document.body.classList.add('admin-mobile-tabs-enabled');
      tabs.hidden = false;
      setSelected(selected);
    } else {
      if (mobileActive) {
        for (const section of sections) {
          section.node.hidden = false;
          section.marker.parentNode.insertBefore(section.node, section.marker.nextSibling);
        }
        mobileActive = false;
      }
      document.body.classList.remove('admin-mobile-tabs-enabled');
      tabs.hidden = true;
      host.hidden = true;
    }
  }

  tabs.addEventListener('click', event => {
    const button = event.target.closest('[data-admin-section]');
    if (!button || !mobileActive) return;
    setSelected(selected === button.dataset.adminSection ? '' : button.dataset.adminSection);
  });

  if (media.addEventListener) media.addEventListener('change', applyLayout);
  else media.addListener(applyLayout);
  applyLayout();
})();
