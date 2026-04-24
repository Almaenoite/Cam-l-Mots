document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('toggleExtension');
    const readingMode = document.getElementById('readingMode');
    const colorDots = document.querySelectorAll('.color-dot');

    // Récupérer l'état sauvegardé (activé par défaut)
    chrome.storage.sync.get({ 
        isEnabled: true, 
        readingMode: 'syllables',
        accentColor: '#E67E22' 
    }, (data) => {
        toggle.checked = data.isEnabled;
        readingMode.value = data.readingMode;
        document.documentElement.style.setProperty('--accent-color', data.accentColor);
        
        // Activer le bon point de couleur
        colorDots.forEach(dot => {
            if (dot.dataset.color === data.accentColor) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    });

    function saveAndReload(newColor = null) {
        chrome.storage.sync.get({ accentColor: '#E67E22' }, (data) => {
            const colorToSave = newColor || data.accentColor;
            chrome.storage.sync.set({ 
                isEnabled: toggle.checked,
                readingMode: readingMode.value,
                accentColor: colorToSave
            }, () => {
                document.documentElement.style.setProperty('--accent-color', colorToSave);
                // Recharger l'onglet actif pour appliquer ou retirer l'effet
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                });
            });
        });
    }

    // Écouter les changements
    toggle.addEventListener('change', () => saveAndReload());
    readingMode.addEventListener('change', () => saveAndReload());

    // Écouter le clic sur les points de couleur
    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            saveAndReload(dot.dataset.color);
        });
    });
});
