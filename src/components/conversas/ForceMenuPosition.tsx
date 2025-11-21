import { useEffect } from 'react';

/**
 * Componente que força o posicionamento correto de todos os menus dropdown
 * Garante que menus sempre abram abaixo do botão, alinhados à direita
 */
export function ForceMenuPosition() {
  useEffect(() => {
    const forceMenuPosition = () => {
      const menus = document.querySelectorAll('[data-radix-popper-content-wrapper]');
      
      menus.forEach((menu) => {
        const menuElement = menu as HTMLElement;
        const side = menuElement.getAttribute('data-side');
        const align = menuElement.getAttribute('data-align');
        
        // Se não for bottom+end, tentar encontrar o botão trigger e reposicionar
        if (side !== 'bottom' || align !== 'end') {
          // Procurar por botões com estado aberto próximos
          const allButtons = document.querySelectorAll('button[data-state="open"], button[aria-expanded="true"]') as NodeListOf<HTMLElement>;
          
          let closestButton: HTMLElement | null = null;
          let minDistance = Infinity;
          
          allButtons.forEach((btn) => {
            const btnRect = (btn as HTMLElement).getBoundingClientRect();
            const menuRect = menuElement.getBoundingClientRect();
            
            // Calcular distância entre botão e menu
            const distance = Math.sqrt(
              Math.pow(btnRect.left - menuRect.left, 2) + 
              Math.pow(btnRect.top - menuRect.top, 2)
            );
            
            if (distance < minDistance && distance < 500) {
              minDistance = distance;
              closestButton = btn as HTMLElement;
            }
          });
          
          if (closestButton) {
            const rect = closestButton.getBoundingClientRect();
            const menuWidth = 224; // w-56
            const offset = 4;
            
            const top = rect.bottom + offset;
            const left = rect.right - menuWidth;
            
            // Forçar posicionamento
            menuElement.style.setProperty('position', 'fixed', 'important');
            menuElement.style.setProperty('top', `${top}px`, 'important');
            menuElement.style.setProperty('left', `${left}px`, 'important');
            menuElement.style.setProperty('right', 'auto', 'important');
            menuElement.style.setProperty('bottom', 'auto', 'important');
            menuElement.style.setProperty('transform', 'none', 'important');
            menuElement.style.setProperty('display', 'block', 'important');
            menuElement.style.setProperty('visibility', 'visible', 'important');
            menuElement.style.setProperty('opacity', '1', 'important');
            menuElement.style.setProperty('z-index', '99999', 'important');
            menuElement.setAttribute('data-side', 'bottom');
            menuElement.setAttribute('data-align', 'end');
          } else {
            // Se não encontrar botão, esconder menu incorreto
            menuElement.style.display = 'none';
            menuElement.style.visibility = 'hidden';
          }
        }
      });
    };

    // Executar imediatamente
    forceMenuPosition();
    
    // Executar múltiplas vezes
    const timeouts = [
      setTimeout(forceMenuPosition, 0),
      setTimeout(forceMenuPosition, 10),
      setTimeout(forceMenuPosition, 50),
      setTimeout(forceMenuPosition, 100),
      setTimeout(forceMenuPosition, 200),
    ];

    // Executar continuamente
    const interval = setInterval(() => {
      const openMenus = document.querySelectorAll('[data-radix-popper-content-wrapper]');
      if (openMenus.length > 0) {
        forceMenuPosition();
      }
    }, 5);

    // Observer para mudanças no DOM
    const observer = new MutationObserver(() => {
      forceMenuPosition();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-side', 'data-align', 'data-state', 'style', 'class', 'aria-expanded'],
    });

    // Listeners
    const handleScroll = () => forceMenuPosition();
    const handleResize = () => forceMenuPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(interval);
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return null;
}

