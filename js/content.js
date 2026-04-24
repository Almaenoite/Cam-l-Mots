// content.js
const color1 = "#2C3E50";
let color2 = "#E67E22";

const vowels = "aeiouyéèêëàâîïôùûüœæAEIOUYÉÈÊËÀÂÎÏÔÙÛÜŒÆ";
// Regex pour capturer les syllabes (heuristique avancée basée sur les attaques de syllabes)
const cons = `[^${vowels}]`;
const digraphs = "ch|ph|th|gn|qu|gu";
const doubleCons = "bb|cc|dd|ff|gg|ll|mm|nn|pp|rr|ss|tt";
const blends = "[bcdfghpvw][lr]";
const onset = `(?:${digraphs}|${blends}|${doubleCons}|${cons})`;
const regex = new RegExp(`(${cons}*[${vowels}]+(?:${cons}*?(?=${onset}[${vowels}])|${cons}+$|))`, 'gi');
// Regex pour séparer les mots de la ponctuation et des espaces
// On inclut les apostrophes à l'intérieur des mots pour regrouper "l'homme", "j'ai", etc.
const chars = "a-zA-Z0-9àâäéèêëîïôöùûüÿçœæÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇŒÆ";
const wordRegex = new RegExp(`(\\[[^\\]]*\\])|([${chars}]+(?:['’][${chars}]+)*)|([^${chars}]+)`, 'g');

function canMakeLiaison(word) {
    const lower = word.toLowerCase().replace(/’/g, "'");
    if (lower === 'et') return false;
    
    // s, x, z font souvent la liaison (pluriels, etc.)
    if (/[sxz]$/i.test(lower)) return true;
    
    // n fait la liaison surtout pour les déterminants/pronoms
    if (lower.endsWith('n')) {
        const nWords = ['un', 'on', 'en', 'mon', 'ton', 'son', 'bon', 'bien', 'rien', 'aucun'];
        return nWords.includes(lower);
    }
    
    // t, d, p, g : liste blanche pour éviter les fausses liaisons (ex: rapport, chat, loup)
    const tdpWhitelist = [
        'est', "c'est", "n'est", "s'est", "qu'est",
        'ont', 'sont', 'font', 'vont', 
        'tout', 'petit', 'grand', 'quand', 
        'faut', 'veut', 'peut', 'fait', 'dit', 'met', 'part', 'sort',
        'avant', 'devant', 'pendant', 'comment', 'dont', 
        'mot', 'beaucoup', 'trop', 'long'
    ];
    return tdpWhitelist.includes(lower);
}

function analyzeSuffix(word, hasLiaison) {
    const lowerWord = word.toLowerCase().replace(/’/g, "'");
    
    if (['le', 'de', 'ce', 'je', 'me', 'te', 'se', 'ne', 'que', 'et'].includes(lowerWord)) {
        return { silentLen: 0, liaisonLen: 0 };
    }
    
    if (['est', "c'est", "n'est", "s'est", "qu'est"].includes(lowerWord)) {
        if (hasLiaison) return { silentLen: 0, liaisonLen: 1 }; // 'es' coloré, 't' liaison
        return { silentLen: 0, liaisonLen: 0 }; // entièrement coloré
    }
    
    if (['les', 'des', 'ces', 'mes', 'tes', 'ses', 'es'].includes(lowerWord)) {
        if (hasLiaison) return { silentLen: 0, liaisonLen: 1 }; // 's' liaison
        return { silentLen: 0, liaisonLen: 0 }; // entièrement coloré
    }
    
    if (lowerWord.match(/(ez|ed|er)$/i)) {
        if (hasLiaison && lowerWord.endsWith('z')) return { silentLen: 0, liaisonLen: 1 };
        if (hasLiaison && lowerWord.endsWith('r')) return { silentLen: 0, liaisonLen: 1 };
        return { silentLen: 0, liaisonLen: 0 };
    }
    
    const match = lowerWord.match(/(es?|[stdxpgz]+)$/i);
    if (match) {
        if (hasLiaison) {
            // La dernière lettre de la chaîne muette est prononcée pour la liaison
            return { silentLen: match[1].length - 1, liaisonLen: 1 };
        }
        return { silentLen: match[1].length, liaisonLen: 0 };
    }
    
    if (hasLiaison && lowerWord.endsWith('n')) {
        return { silentLen: 0, liaisonLen: 1 }; // ex: 'un'
    }
    
    return { silentLen: 0, liaisonLen: 0 };
}

let globalSegmentToggle = true;

function processTextNodeSegments(node) {
    const text = node.nodeValue;
    if (!text.trim() && text.length > 0) {
        const span = document.createElement('span');
        span.setAttribute('data-syllable', 'true');
        span.style.color = globalSegmentToggle ? color1 : color2;
        span.textContent = text;
        if (node.parentNode) node.parentNode.replaceChild(span, node);
        return;
    }

    const fragment = document.createDocumentFragment();
    const parts = text.split(/([.,;:!?…()]+[\s\u00A0]*)/);
    
    parts.forEach(part => {
        if (!part) return;
        
        const isPunctuation = /^[.,;:!?…()]+[\s\u00A0]*$/.test(part);
        const hasOpeningParen = /\(/.test(part);
        
        // Si c'est une ponctuation qui contient une parenthèse ouvrante, on bascule la couleur AVANT.
        // Ainsi, la parenthèse ouvrante prend la couleur du texte à l'intérieur.
        if (isPunctuation && hasOpeningParen) {
            globalSegmentToggle = !globalSegmentToggle;
        }
        
        const span = document.createElement('span');
        span.setAttribute('data-syllable', 'true');
        span.style.color = globalSegmentToggle ? color1 : color2;
        span.textContent = part;
        fragment.appendChild(span);
        
        // Si c'est une ponctuation classique (ou parenthèse fermante), on bascule la couleur APRÈS.
        // Ainsi, la ponctuation/parenthèse fermante garde la couleur du texte précédent.
        if (isPunctuation && !hasOpeningParen) {
            globalSegmentToggle = !globalSegmentToggle;
        }
    });

    if (node.parentNode) {
        node.parentNode.replaceChild(fragment, node);
    }
}

function processTextNode(node) {
    const text = node.nodeValue;
    if (!text.trim()) return;

    const fragment = document.createDocumentFragment();
    let tokens = [];
    let match;
    
    // Réinitialiser la regex car elle a le flag 'g'
    wordRegex.lastIndex = 0;
    
    while ((match = wordRegex.exec(text)) !== null) {
        if (match[1]) {
            // Contenu entre crochets (ex: [2], [N 2]) traité comme du texte ignoré
            tokens.push({ type: 'nonWord', text: match[1] });
        } else if (match[2]) {
            tokens.push({ type: 'word', text: match[2] });
        } else if (match[3]) {
            tokens.push({ type: 'nonWord', text: match[3] });
        }
    }

    // Détection des liaisons
    const vowelsAndH = "aeiouyéèêëàâîïôùûüœæAEIOUYÉÈÊËÀÂÎÏÔÙÛÜŒÆhH";
    
    for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].type === 'word' && tokens[i+1].type === 'nonWord' && tokens[i+2].type === 'word') {
            let wA = tokens[i].text.toLowerCase();
            let nw = tokens[i+1].text;
            let wB = tokens[i+2].text;
            
            if (canMakeLiaison(wA)) {
                // S'il n'y a que des espaces entre les mots
                if (/^[ \u00A0]+$/.test(nw)) {
                    // Et que le mot suivant commence par une voyelle ou un H
                    if (vowelsAndH.includes(wB.charAt(0))) {
                        tokens[i].hasLiaison = true;
                        tokens[i+1].isLiaisonSpace = true;
                    }
                }
            }
        }
    }

    let wordToggle = true; // Variable persistante pour alterner en continu sur tous les mots

    tokens.forEach(token => {
        if (token.type === 'word') {
            let parts = token.text.match(regex);
            let { silentLen, liaisonLen } = analyzeSuffix(token.text, token.hasLiaison);
            let startsWithH = token.text.toLowerCase().startsWith('h');
            
            if (parts) {
                parts.forEach((part, index) => {
                    const isFirst = (index === 0);
                    const isLast = (index === parts.length - 1);
                    
                    const span = document.createElement('span');
                    span.setAttribute('data-syllable', 'true');
                    span.style.color = wordToggle ? color1 : color2;
                    
                    let currentPart = part;
                    let prefix = "";
                    let silentText = "";
                    let liaisonText = "";
                    
                    // H initial muet
                    if (isFirst && startsWithH && currentPart.toLowerCase().startsWith('h')) {
                        prefix = currentPart.charAt(0);
                        currentPart = currentPart.slice(1);
                    }
                    
                    // Lettres muettes et lettre de liaison (sur la dernière syllabe)
                    if (isLast) {
                        let totalSuffixLen = silentLen + liaisonLen;
                        if (totalSuffixLen > 0 && currentPart.length >= totalSuffixLen) {
                            liaisonText = currentPart.slice(currentPart.length - liaisonLen);
                            silentText = currentPart.slice(currentPart.length - totalSuffixLen, currentPart.length - liaisonLen);
                            currentPart = currentPart.slice(0, currentPart.length - totalSuffixLen);
                        }
                    }
                    
                    if (prefix) {
                        const muteSpan = document.createElement('span');
                        muteSpan.textContent = prefix;
                        muteSpan.style.color = "#B0B0B0";
                        span.appendChild(muteSpan);
                    }
                    
                    if (currentPart) {
                        span.appendChild(document.createTextNode(currentPart));
                    }
                    
                    if (silentText) {
                        const muteSpan = document.createElement('span');
                        muteSpan.textContent = silentText;
                        muteSpan.style.color = "#B0B0B0";
                        span.appendChild(muteSpan);
                    }
                    
                    if (liaisonText) {
                        // La consonne de liaison prend la couleur de la PROCHAINE syllabe
                        let nextColor = (!wordToggle) ? color1 : color2;
                        const liaisonSpan = document.createElement('span');
                        liaisonSpan.textContent = liaisonText;
                        liaisonSpan.style.color = nextColor;
                        span.appendChild(liaisonSpan);
                    }
                    
                    // On n'alterne la couleur que si la syllabe contient des lettres prononcées
                    if (currentPart.length > 0 || liaisonText.length > 0) {
                        wordToggle = !wordToggle;
                    }
                    fragment.appendChild(span);
                });
            } else {
                const span = document.createElement('span');
                span.textContent = token.text;
                span.style.color = wordToggle ? color1 : color2;
                span.setAttribute('data-syllable', 'true');
                fragment.appendChild(span);
                wordToggle = !wordToggle;
            }
        } else if (token.type === 'nonWord') {
            if (token.isLiaisonSpace) {
                const liaisonSpan = document.createElement('span');
                liaisonSpan.textContent = "‿";
                liaisonSpan.style.color = "#B0B0B0"; // Couleur discrète pour la liaison
                liaisonSpan.setAttribute('data-syllable', 'true');
                
                fragment.appendChild(liaisonSpan);
                fragment.appendChild(document.createTextNode("\u200B")); // Espace de largeur nulle pour autoriser le retour à la ligne
                
                if (token.text.length > 1) {
                    fragment.appendChild(document.createTextNode(token.text.slice(1)));
                }
            } else {
                fragment.appendChild(document.createTextNode(token.text));
            }
        }
    });
    
    if (node.parentNode) {
        node.parentNode.replaceChild(fragment, node);
    }
}

function colorizeTree(root) {
    const treeWalker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (node.parentNode) {
                    const tag = node.parentNode.nodeName.toLowerCase();
                    // Ignorer les balises techniques, non-textuelles ou les références (sup/sub)
                    if (['script', 'style', 'noscript', 'code', 'textarea', 'sup', 'sub'].includes(tag) || 
                        node.parentNode.isContentEditable) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Ignorer les éléments déjà traités (on vérifie le parent et les ancêtres)
                    if (node.parentNode.hasAttribute('data-syllable') || 
                        node.parentNode.closest('[data-syllable]')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );

    let nodes = [];
    while (treeWalker.nextNode()) {
        nodes.push(treeWalker.currentNode);
    }
    
    nodes.forEach(node => {
        if (currentReadingMode === 'segments') {
            processTextNodeSegments(node);
        } else {
            processTextNode(node);
        }
    });
}

// Variables pour gérer l'observateur sans boucle infinie
let observer;
let timeoutId = null;
let currentReadingMode = 'syllables';

function initObserver() {
    observer = new MutationObserver((mutations) => {
        // Debounce pour éviter de geler la page s'il y a des milliers de mutations rapides
        clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
            // Déconnecter temporairement l'observateur !
            // C'est CRUCIAL car nos remplacements de texte (replaceChild) génèrent de nouvelles mutations.
            // Sans ça, l'observateur tourne en boucle à l'infini et fait freezer la page.
            observer.disconnect();
            
            let nodesToProcess = [];
            
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Si le nouveau noeud n'est pas déjà un de nos spans colorisés
                        if (!node.hasAttribute('data-syllable') && !node.closest('[data-syllable]')) {
                            nodesToProcess.push(node);
                        }
                    } else if (node.nodeType === Node.TEXT_NODE) {
                        if (node.parentNode && !node.parentNode.closest('[data-syllable]')) {
                            nodesToProcess.push(node);
                        }
                    }
                }
            }
            
            nodesToProcess.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    if (node.parentNode && !node.parentNode.closest('[data-syllable]')) {
                        if (currentReadingMode === 'segments') {
                            processTextNodeSegments(node);
                        } else {
                            processTextNode(node);
                        }
                    }
                } else {
                    colorizeTree(node);
                }
            });
            
            // Reconnecter l'observateur une fois nos modifications terminées
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
            }
        }, 100); // Attendre 100ms que la page se stabilise
    });
    
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

function runAll() {
    if (observer) observer.disconnect();
    
    // Lancement initial sur toute la page
    colorizeTree(document.body);
    
    if (!observer) {
        initObserver();
    } else if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

function initExtension() {
    // On récupère l'état activé, le mode de lecture et la couleur d'accent
    chrome.storage.sync.get({ 
        isEnabled: true, 
        readingMode: 'syllables',
        accentColor: '#E67E22' 
    }, (data) => {
        if (data.isEnabled) {
            currentReadingMode = data.readingMode;
            color2 = data.accentColor;
            runAll();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtension);
} else {
    initExtension();
}
