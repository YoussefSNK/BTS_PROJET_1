function toggleQuarterCircle() {
    var quarterCircle = document.getElementById('quarter-circle');
    var icon = document.getElementById('icon');
    var buttons = document.querySelector('#quarter-circle .buttons');
    
    if (quarterCircle.classList.contains('clicked')) {
        // Masquer les boutons d'abord
        buttons.style.opacity = '0';
        setTimeout(() => {
            // Masquer l'icône ensuite
            icon.classList.remove('hidden');
            // Revenir à la forme initiale du quart de cercle après la disparition des boutons
            setTimeout(() => {
                quarterCircle.classList.remove('clicked');
            }, 100);
        }, 100);
    } else {
        // Masquer l'icône d'abord
        icon.classList.add('hidden');
        setTimeout(() => {
            // Changer la forme du quart de cercle après la disparition de l'icône
            quarterCircle.classList.add('clicked');
            // Afficher les boutons ensuite
            setTimeout(() => {
                buttons.style.opacity = '1';
            }, 100);
        }, 100);
    }
}
