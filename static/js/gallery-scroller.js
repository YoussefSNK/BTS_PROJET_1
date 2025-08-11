/**
 * Gallery Scroller - Bibliothèque pour une galerie interactive avec défilement fluide
 * Implémente un système de défilement horizontal avancé avec inertie, snap et limites
 */

class GalleryScroller {
    constructor(options) {
        // Options et éléments du DOM
        this.track = options.track;
        this.wrapper = options.wrapper;
        this.prevBtn = options.prevBtn;
        this.nextBtn = options.nextBtn;
        this.scrollbarThumb = options.scrollbarThumb;
        this.scrollbarTrack = options.scrollbarTrack;
        this.paginationContainer = options.paginationContainer;
        
        // Variables d'état
        this.items = this.track.querySelectorAll('.gallery-item');
        this.itemCount = this.items.length;
        this.currentIndex = 0;
        this.itemsPerPage = this.calculateItemsPerPage();
        this.pageCount = Math.ceil(this.itemCount / this.itemsPerPage);
        
        // Variables pour le suivi des interactions
        this.isDragging = false;
        this.startX = 0;
        this.startScrollLeft = 0;
        this.touchStartX = 0;
        this.lastDragX = 0;
        this.animationID = null;
        this.lastTimestamp = 0;
        this.velocity = 0;
        
        // Initialisation
        this.setupEventListeners();
        this.createPagination();
        this.updateScrollbar();
        this.updateButtonStates();
    }
    
    // Calcule combien d'items peuvent être affichés à la fois
    calculateItemsPerPage() {
        // Déterminer le nombre d'items par page en fonction de la largeur
        if (window.innerWidth < 480) return 1;
        if (window.innerWidth < 768) return 2;
        if (window.innerWidth < 1024) return 3;
        return 4;
    }
    
    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Navigation avec les boutons
        this.prevBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());
        
        // Interaction avec la souris pour le défilement
        this.track.addEventListener('mousedown', this.startDrag.bind(this));
        window.addEventListener('mousemove', this.drag.bind(this));
        window.addEventListener('mouseup', this.endDrag.bind(this));
        
        // Interaction tactile pour mobile
        this.track.addEventListener('touchstart', this.startTouch.bind(this), { passive: true });
        this.track.addEventListener('touchmove', this.moveTouch.bind(this), { passive: false });
        this.track.addEventListener('touchend', this.endTouch.bind(this));
        
        // Scrollbar customisée
        this.scrollbarTrack.addEventListener('click', this.clickScrollbar.bind(this));
        this.scrollbarThumb.addEventListener('mousedown', this.startScrollbarDrag.bind(this));
        
        // Redimensionnement de la fenêtre
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Touches clavier (flèches gauche/droite)
        document.addEventListener('keydown', this.handleKeydown.bind(this));
    }
    
    // Navigation vers l'élément précédent
    prev() {
        const targetIndex = Math.max(0, this.currentIndex - this.itemsPerPage);
        this.goToItem(targetIndex);
    }
    
    // Navigation vers l'élément suivant
    next() {
        const targetIndex = Math.min(this.itemCount - 1, this.currentIndex + this.itemsPerPage);
        this.goToItem(targetIndex);
    }
    
    // Aller à un élément spécifique
    goToItem(index, animate = true) {
        // S'assurer que l'index ne dépasse pas la limite
        const maxIndex = Math.max(0, this.itemCount - this.itemsPerPage);
        index = Math.max(0, Math.min(index, maxIndex));
        
        const itemWidth = this.items[0].offsetWidth;
        const trackPadding = parseInt(window.getComputedStyle(this.track).paddingLeft) || 0;
        const targetPosition = index * itemWidth - trackPadding;
        
        this.currentIndex = index;
        
        if (animate) {
            this.track.style.transition = 'transform 0.5s cubic-bezier(0.15, 0.3, 0.25, 1)';
        } else {
            this.track.style.transition = 'none';
        }
        
        this.track.style.transform = `translateX(-${targetPosition}px)`;
        
        // Mettre à jour l'interface
        this.updateButtonStates();
        this.updateScrollbar();
        this.updateActivePagination();
        
        // Réactiver la transition après l'animation
        if (!animate) {
            setTimeout(() => {
                this.track.style.transition = 'transform 0.5s cubic-bezier(0.15, 0.3, 0.25, 1)';
            }, 10);
        }
    }
    
    // Mise à jour de l'état des boutons de navigation
    updateButtonStates() {
        this.prevBtn.disabled = this.currentIndex === 0;
        this.nextBtn.disabled = this.currentIndex >= this.itemCount - this.itemsPerPage;
        
        // Ajuster la visibilité plutôt que de désactiver
        this.prevBtn.style.opacity = this.currentIndex === 0 ? '0.3' : '1';
        this.nextBtn.style.opacity = this.currentIndex >= this.itemCount - this.itemsPerPage ? '0.3' : '1';
    }
    
    // Mise à jour de la scrollbar
    updateScrollbar() {
        const scrollPercentage = this.currentIndex / (this.itemCount - this.itemsPerPage);
        const thumbWidth = (this.itemsPerPage / this.itemCount) * 100;
        const thumbPosition = scrollPercentage * (100 - thumbWidth);
        
        this.scrollbarThumb.style.width = `${thumbWidth}%`;
        this.scrollbarThumb.style.left = `${thumbPosition}%`;
    }
    
    // Création des points de pagination
    createPagination() {
        this.paginationContainer.innerHTML = '';
        
        for (let i = 0; i < this.pageCount; i++) {
            const dot = document.createElement('div');
            dot.classList.add('pagination-dot');
            if (i === 0) dot.classList.add('active');
            
            dot.addEventListener('click', () => {
                const targetIndex = i * this.itemsPerPage;
                this.goToItem(targetIndex);
            });
            
            this.paginationContainer.appendChild(dot);
        }
    }
    
    // Mise à jour de la pagination
    updatePagination() {
        // Recalculer le nombre de pages
        this.itemsPerPage = this.calculateItemsPerPage();
        this.pageCount = Math.ceil(this.itemCount / this.itemsPerPage);
        
        // Recréer la pagination
        this.createPagination();
    }
    
    // Mise à jour du point actif dans la pagination
    updateActivePagination() {
        const currentPage = Math.floor(this.currentIndex / this.itemsPerPage);
        const dots = this.paginationContainer.querySelectorAll('.pagination-dot');
        
        dots.forEach((dot, index) => {
            if (index === currentPage) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    // Gestion du redimensionnement de la fenêtre
    handleResize() {
        // Recalculer les dimensions
        this.itemsPerPage = this.calculateItemsPerPage();
        this.pageCount = Math.ceil(this.itemCount / this.itemsPerPage);
        
        // Ajuster la position actuelle
        this.goToItem(Math.min(this.currentIndex, this.itemCount - 1), false);
        
        // Recréer la pagination
        this.createPagination();
    }
    
    // Événement de début de glissement
    startDrag(e) {
        if (this.isDragging) return;
        
        this.isDragging = true;
        this.startX = e.clientX;
        this.lastDragX = e.clientX;
        this.lastTimestamp = Date.now();
        this.velocity = 0;
        
        // Désactiver la transition pendant le glissement
        this.track.style.transition = 'none';
        this.track.style.cursor = 'grabbing';
        this.wrapper.classList.add('grabbing');
        
        // Position de départ
        const style = window.getComputedStyle(this.track);
        const transform = style.transform || style.webkitTransform;
        const transformMatrix = transform.match(/matrix.*\((.+)\)/);
        
        if (transformMatrix) {
            this.startScrollLeft = -parseFloat(transformMatrix[1].split(', ')[4]);
        } else {
            this.startScrollLeft = 0;
        }
        
        e.preventDefault();
        
        // Arrêter l'animation d'inertie si elle est en cours
        if (this.animationID) {
            cancelAnimationFrame(this.animationID);
            this.animationID = null;
        }
    }
    
    // Événement de glissement en cours
    drag(e) {
        if (!this.isDragging) return;
        
        // Calculer la distance parcourue
        const x = e.clientX;
        const deltaX = x - this.startX;
        const now = Date.now();
        
        // Calculer la vélocité pour l'inertie
        const timeDelta = now - this.lastTimestamp;
        if (timeDelta > 0) {
            this.velocity = (x - this.lastDragX) / timeDelta;
        }
        
        this.lastDragX = x;
        this.lastTimestamp = now;
        
        // Calculer la nouvelle position avec limites
        let positionX = this.startScrollLeft - deltaX;
        
        // Appliquer les limites de défilement
        const maxScroll = this.calculateMaxScroll();
        positionX = Math.max(0, Math.min(positionX, maxScroll));
        
        // Appliquer le déplacement
        this.track.style.transform = `translateX(-${positionX}px)`;
        
        e.preventDefault();
    }
    
    // Événement de fin de glissement
    endDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.track.style.cursor = 'grab';
        this.wrapper.classList.remove('grabbing');
        
        // Style de transition pour le snapback et l'inertie
        this.track.style.transition = 'transform 0.5s cubic-bezier(0.15, 0.3, 0.25, 1)';
        
        // Appliquer l'inertie si la vélocité est significative
        if (Math.abs(this.velocity) > 0.5) {
            this.applyInertia();
        } else {
            // Sinon, snap à l'élément le plus proche
            this.snapToClosestItem();
        }
    }
    
    // Appliquer l'effet d'inertie après le glissement
    applyInertia() {
        const decelerationRate = 0.95; // Taux de décélération
        let currentPosition = this.getTrackPosition();
        const maxScroll = this.calculateMaxScroll();
        
        const animate = () => {
            // Réduire la vélocité progressivement
            this.velocity *= decelerationRate;
            
            // Appliquer le mouvement d'inertie avec limites
            currentPosition -= this.velocity * 15;
            
            // Appliquer les limites et réduire la vélocité si on atteint les bords
            if (currentPosition < 0) {
                currentPosition = 0;
                this.velocity = 0;
            } else if (currentPosition > maxScroll) {
                currentPosition = maxScroll;
                this.velocity = 0;
            }
            
            this.track.style.transition = 'none';
            this.track.style.transform = `translateX(-${currentPosition}px)`;
            
            // Arrêter l'animation quand la vélocité devient négligeable
            if (Math.abs(this.velocity) > 0.05) {
                this.animationID = requestAnimationFrame(animate);
            } else {
                // Snap à l'élément le plus proche quand l'inertie s'arrête
                this.snapToClosestItem();
            }
        };
        
        this.animationID = requestAnimationFrame(animate);
    }
    
    // Récupérer la position actuelle du track
    getTrackPosition() {
        const style = window.getComputedStyle(this.track);
        const transform = style.transform || style.webkitTransform;
        const transformMatrix = transform.match(/matrix.*\((.+)\)/);
        
        if (transformMatrix) {
            return -parseFloat(transformMatrix[1].split(', ')[4]);
        }
        return 0;
    }
    
    // Snap à l'élément le plus proche après glissement
    snapToClosestItem() {
        const currentPosition = this.getTrackPosition();
        const itemWidth = this.items[0].offsetWidth;
        const trackPadding = parseInt(window.getComputedStyle(this.track).paddingLeft) || 0;
        
        // Déterminer l'index le plus proche
        let closestIndex = Math.round(currentPosition / itemWidth);
        
        // S'assurer que l'index est dans les limites
        closestIndex = Math.max(0, Math.min(closestIndex, this.itemCount - 1));
        
        // Si on est à la fin du contenu, s'assurer de ne pas dépasser
        const lastVisibleIndex = this.itemCount - this.itemsPerPage;
        if (closestIndex > lastVisibleIndex) {
            closestIndex = lastVisibleIndex;
        }
        
        // Aller à cet élément avec animation
        this.goToItem(closestIndex);
    }
    
    // Calculer la position maximale de défilement
    calculateMaxScroll() {
        const trackWidth = this.track.scrollWidth;
        const wrapperWidth = this.wrapper.offsetWidth;
        return Math.max(0, trackWidth - wrapperWidth);
    }
    
    // Gestion du clic sur la scrollbar
    clickScrollbar(e) {
        const trackRect = this.scrollbarTrack.getBoundingClientRect();
        const thumbWidth = this.scrollbarThumb.offsetWidth;
        const clickPosition = (e.clientX - trackRect.left) / trackRect.width;
        
        // Calculer l'index cible en fonction de la position du clic
        const targetIndex = Math.floor(clickPosition * (this.itemCount - this.itemsPerPage));
        
        // Aller à cet élément
        this.goToItem(targetIndex);
    }
    
    // Gestion du drag de la scrollbar
    startScrollbarDrag(e) {
        e.stopPropagation();
        const thumbRect = this.scrollbarThumb.getBoundingClientRect();
        const offsetX = e.clientX - thumbRect.left;
        
        const handleScrollbarMove = (moveEvent) => {
            const trackRect = this.scrollbarTrack.getBoundingClientRect();
            const thumbWidth = this.scrollbarThumb.offsetWidth;
            
            // Calculer la position du pouce en pourcentage
            let position = (moveEvent.clientX - trackRect.left - offsetX) / (trackRect.width - thumbWidth);
            position = Math.max(0, Math.min(1, position));
            
            // Calculer l'index basé sur la position
            const targetIndex = Math.floor(position * (this.itemCount - this.itemsPerPage));
            
            // Aller à cet élément sans animation pour un suivi fluide
            this.goToItem(targetIndex, false);
        };
        
        const handleScrollbarUp = () => {
            window.removeEventListener('mousemove', handleScrollbarMove);
            window.removeEventListener('mouseup', handleScrollbarUp);
        };
        
        window.addEventListener('mousemove', handleScrollbarMove);
        window.addEventListener('mouseup', handleScrollbarUp);
    }
    
    // Gestion des événements tactiles
    startTouch(e) {
        this.touchStartX = e.touches[0].clientX;
        
        // Similaire au startDrag mais pour les événements tactiles
        if (this.isDragging) return;
        
        this.isDragging = true;
        this.startX = this.touchStartX;
        this.lastDragX = this.touchStartX;
        this.lastTimestamp = Date.now();
        this.velocity = 0;
        
        this.track.style.transition = 'none';
        this.wrapper.classList.add('grabbing');
        
        const style = window.getComputedStyle(this.track);
        const transform = style.transform || style.webkitTransform;
        const transformMatrix = transform.match(/matrix.*\((.+)\)/);
        
        if (transformMatrix) {
            this.startScrollLeft = -parseFloat(transformMatrix[1].split(', ')[4]);
        } else {
            this.startScrollLeft = 0;
        }
        
        if (this.animationID) {
            cancelAnimationFrame(this.animationID);
            this.animationID = null;
        }
    }
    
    moveTouch(e) {
        if (!this.isDragging) return;
        
        // Similaire au drag mais pour les événements tactiles
        const x = e.touches[0].clientX;
        const deltaX = x - this.startX;
        const now = Date.now();
        
        const timeDelta = now - this.lastTimestamp;
        if (timeDelta > 0) {
            this.velocity = (x - this.lastDragX) / timeDelta;
        }
        
        this.lastDragX = x;
        this.lastTimestamp = now;
        
        // Calculer la nouvelle position avec limites
        let positionX = this.startScrollLeft - deltaX;
        
        // Appliquer les limites de défilement
        const maxScroll = this.calculateMaxScroll();
        positionX = Math.max(0, Math.min(positionX, maxScroll));
        
        // Appliquer le déplacement
        this.track.style.transform = `translateX(-${positionX}px)`;
        
        // Empêcher le défilement de page lors du défilement horizontal
        if (Math.abs(deltaX) > 10) {
            e.preventDefault();
        }
    }
    
    endTouch() {
        // Identique à endDrag
        this.endDrag();
    }
    
    // Gestion des touches clavier
    handleKeydown(e) {
        if (e.key === 'ArrowLeft') {
            this.prev();
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            this.next();
            e.preventDefault();
        }
    }
}

// Fonction de filtrage par ratio que nous exposons globalement
function filterGalleryByRatio(inputRatio, allowInverted, items, gallery) {
    if (isNaN(inputRatio)) {
        return;
    }

    let sortedItems = Array.from(items).sort((a, b) => {
        let ratioA = parseFloat(a.dataset.ratio);
        let ratioB = parseFloat(b.dataset.ratio);
        let widthA = parseInt(a.dataset.width);
        let heightA = parseInt(a.dataset.height);
        let widthB = parseInt(b.dataset.width);
        let heightB = parseInt(b.dataset.height);

        let diffA = Math.abs(ratioA - inputRatio);
        let diffB = Math.abs(ratioB - inputRatio);

        if (allowInverted) {
            let inverseRatioA = heightA / widthA;
            let inverseRatioB = heightB / widthB;
            diffA = Math.min(diffA, Math.abs(inverseRatioA - inputRatio));
            diffB = Math.min(diffB, Math.abs(inverseRatioB - inputRatio));
        }

        return diffA - diffB;
    });

    // Vider puis remplir le conteneur avec les éléments triés
    const track = items[0].parentNode;
    track.innerHTML = "";
    sortedItems.forEach(item => track.appendChild(item));
    
    // Réinitialiser la position et la pagination
    gallery.goToItem(0, false);
    gallery.updatePagination();
} 