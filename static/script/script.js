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





function sortTable(columnIndex) {
    var table = document.getElementById("poster-table");
    var rows = table.rows;
    var switching = true;
    var shouldSwitch, i, x, y;
    var direction = "asc";
    var switchCount = 0;

    while (switching) {
        switching = false;
        var rowsArray = Array.prototype.slice.call(rows, 1);  // Exclude header row
        for (i = 0; i < rowsArray.length - 1; i++) {
            shouldSwitch = false;
            x = rowsArray[i].getElementsByTagName("TD")[columnIndex];
            y = rowsArray[i + 1].getElementsByTagName("TD")[columnIndex];

            if (columnIndex!=0){
                if (direction == "asc") {
                    if (parseInt(x.innerHTML.toLowerCase())> parseInt(y.innerHTML.toLowerCase())) {
                        console.log(x.innerHTML.toLowerCase(), ">", y.innerHTML.toLowerCase())
                        shouldSwitch = true;
                        break;
                    }
                } else if (direction == "desc") {
                    if (parseInt(x.innerHTML.toLowerCase()) < parseInt(y.innerHTML.toLowerCase())) {
                        shouldSwitch = true;
                        break;
                    }
                }
            }
            else{
                if (direction == "asc") {
                    if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                        console.log(x.innerHTML.toLowerCase(), ">", y.innerHTML.toLowerCase())
                        shouldSwitch = true;
                        break;
                    }
                } else if (direction == "desc") {
                    if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                        shouldSwitch = true;
                        break;
                    }
                }
            }

        }
        if (shouldSwitch) {
            rowsArray[i].parentNode.insertBefore(rowsArray[i + 1], rowsArray[i]);
            switching = true;
            switchCount++;
        } else {
            if (switchCount == 0 && direction == "asc") {
                direction = "desc";
                switching = true;
            }
        }
    }
}

function filterByRatio() {
    var inputRatio = parseFloat(document.getElementById("ratio-input").value);
    if (isNaN(inputRatio)) {
        alert("Veuillez entrer un ratio valide.");
        return;
    }

    var table = document.getElementById("poster-table");
    var rows = Array.from(table.rows).slice(1); // Exclude header row

    // Filter rows based on the closest ratio
    rows.sort(function(a, b) {
        var ratioA = parseFloat(a.cells[1].innerText);
        var ratioB = parseFloat(b.cells[1].innerText);

        return Math.abs(ratioA - inputRatio) - Math.abs(ratioB - inputRatio);
    });

    // Append sorted rows back to the table
    var tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    rows.forEach(function(row) {
        tbody.appendChild(row);
    });
}