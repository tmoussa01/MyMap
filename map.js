
let currentDrawInteraction = null;
let currentMeasureType = null;
const vectorSource = new ol.source.Vector();
const vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: 'blue',
            width: 2
        }),
        fill: new ol.style.Fill({
            color: 'rgba(0, 0, 255, 0.1)'
        })
    })
});



const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM(),
            visible: true
        }),
        new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            }),
            visible: false
        }),
        new ol.layer.Tile({
            source: new ol.source.XYZ({
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
            }),
            visible: false
        }),
        vectorLayer
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([4.5, 50.85]),
        zoom: 9,
        minZoom: 7,
        maxZoom: 19
    })
});


function addDrawInteraction(type) {
    if (currentDrawInteraction) {
        map.removeInteraction(currentDrawInteraction);
    }

    currentMeasureType = type;
    currentDrawInteraction = new ol.interaction.Draw({
        source: vectorSource,
        type: type,
        style: new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'blue',
                width: 2
            }),
            fill: new ol.style.Fill({
                color: 'rgba(0, 0, 255, 0.1)'
            })
        })
    });

    currentDrawInteraction.on('drawend', function (event) {
        const geometry = event.feature.getGeometry();
        let measureResult;

        if (type === 'LineString') {
            measureResult = formatLength(geometry);
        } else if (type === 'Polygon') {
            measureResult = formatArea(geometry);
        }

        document.getElementById('measureInfo').textContent = measureResult;
    });

    map.addInteraction(currentDrawInteraction);
}


function formatLength(line) {
    const coordinates = line.getCoordinates();
    let length = 0;
    for (let i = 1; i < coordinates.length; i++) {
        length = ol.sphere.getLength(line);

    }
    return Math.round(length / 1000 * 100) / 100 + ' km';
}


function formatArea(polygon) {
    const area = ol.sphere.getArea(polygon);
    return Math.round(area / 1000000 * 100) / 100 + ' km²';
}
document.getElementById('measureButton').addEventListener('click', function () {

    const panel = document.getElementById('measurePanel');

    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
});

document.getElementById('measureDistanceButton').addEventListener('click', function () {
    document.getElementById('measureResultPanel').style.display = 'block';
    addDrawInteraction('LineString');
});

document.getElementById('measureAreaButton').addEventListener('click', function () {
    document.getElementById('measureResultPanel').style.display = 'block';
    addDrawInteraction('Polygon');
});

document.getElementById('resetButton').addEventListener('click', function () {
    vectorSource.clear();
    document.getElementById('measureInfo').textContent = 'Sélectionnez un outil de mesure.';
});

document.getElementById('closeMeasurePanel').addEventListener('click', function () {
    document.getElementById('measureResultPanel').style.display = 'none';
    if (currentDrawInteraction) {
        map.removeInteraction(currentDrawInteraction);
        currentDrawInteraction = null;
    }
});


document.getElementById('basemapButton').addEventListener('click', function () {
    const panel = document.getElementById('basemapPanel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
});

document.querySelectorAll('.basemap-option').forEach(option => {
    option.addEventListener('click', function () {
        const basemap = this.getAttribute('data-basemap');
        map.getLayers().forEach((layer, index) => {
            layer.setVisible(index === 0 && basemap === 'osm' || index === 1 && basemap === 'esri' || index === 2 && basemap === 'topo');
        });
        document.getElementById('basemapPanel').style.display = 'none';
    });
});

document.getElementById('searchButton').addEventListener('click', function () {
    let query = document.getElementById('searchBox').value;

    if (!query) {
        alert("Veuillez entrer une adresse !");
        return;
    }


    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                alert("Adresse non trouvée !");
                return;
            }

            let lon = parseFloat(data[0].lon);
            let lat = parseFloat(data[0].lat);
            let coords = ol.proj.fromLonLat([lon, lat]);


            map.getView().animate({
                center: coords,
                zoom: 14,
                duration: 1000
            });


            addMarker(coords);
        })
        .catch(error => console.error("Erreur lors de la recherche :", error));
});
document.getElementById('searchBox').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        document.getElementById('searchButton').click();
    }
});

function addMarker(coords) {
    let marker = new ol.Feature({
        geometry: new ol.geom.Point(coords)
    });

    let markerStyle = new ol.style.Style({
        image: new ol.style.Icon({
            src: 'img/marker.png',
            scale: 0.05
        })
    });

    marker.setStyle(markerStyle);

    let markerSource = new ol.source.Vector({
        features: [marker]
    });

    let markerLayer = new ol.layer.Vector({
        source: markerSource
    });

    map.addLayer(markerLayer);
}

document.getElementById('printButton').addEventListener('click', function () {
    printMap();
});

function printMap() {
    const mapElement = document.getElementById('map');


    document.querySelectorAll('.button-container, .panel, header').forEach(el => el.style.display = 'none');

    html2canvas(mapElement).then(canvas => {
        const imgData = canvas.toDataURL('image/png');


        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('landscape', 'mm', 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = (pdfHeight - imgHeight * ratio) / 2;

        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save('Carte_Belgique.pdf');


        document.querySelectorAll('.button-container, .panel, header').forEach(el => el.style.display = 'block');
    });
}

