import { useEffect, useRef } from 'react';

/**
 * Hook para forçar o posicionamento correto de menus dropdown
 * Garante que o menu sempre abra abaixo do botão, alinhado à direita
 */
export function useForceMenuPosition(menuOpen: boolean, buttonRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!menuOpen) return;

    const forcePosition = () => {
      // Encontrar todos os menus abertos
      const menus = document.querySelectorAll('[data-radix-popper-content-wrapper]');
      
      menus.forEach((menu) => {
        const menuElement = menu as HTMLElement;
        const side = menuElement.getAttribute('data-side');
        const align = menuElement.getAttribute('data-align');
        
        // Se não for bottom+end, forçar correção
        if (side !== 'bottom' || align !== 'end') {
          const button = buttonRef.current;
          
          if (button) {
            const rect = button.getBoundingClientRect();
            const menuWidth = 224; // w-56 = 14rem = 224px
            const offset = 4;
            
            const top = rect.bottom + offset;
            const left = rect.right - menuWidth;
            
            // Forçar posicionamento com !important
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
            // Se não encontrar o botão, esconder menu incorreto
            menuElement.style.display = 'none';
          }
        }
      });
    };

    // Executar imediatamente
    forcePosition();
    
    // Executar múltiplas vezes para garantir
    const timeouts = [
      setTimeout(forcePosition, 0),
      setTimeout(forcePosition, 10),
      setTimeout(forcePosition, 50),
      setTimeout(forcePosition, 100),
    ];

    // Executar continuamente enquanto o menu estiver aberto
    const interval = setInterval(forcePosition, 5);

    // Observer para mudanças no DOM
    const observer = new MutationObserver(forcePosition);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-side', 'data-align', 'data-state', 'style', 'class'],
    });

    // Listeners de scroll e resize
    const handleScroll = () => forcePosition();
    const handleResize = () => forcePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      timeouts.forEach(clearTimeout);
      clearInterval(interval);
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [menuOpen, buttonRef]);
}

