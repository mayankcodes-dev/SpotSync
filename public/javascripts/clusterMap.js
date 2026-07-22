if (typeof maptilersdk === 'undefined' || !maptilerApiKey) {
    const el = document.getElementById('cluster-map');
    if (el) {
        el.innerHTML = '<div class="d-flex align-items-center justify-content-center h-100 text-muted small p-4 text-center">Map unavailable. Add a valid MAPTILER_API_KEY in your environment to show the cluster map.</div>';
    }
} else {
    maptilersdk.config.apiKey = maptilerApiKey;

    const map = new maptilersdk.Map({
        container: 'cluster-map',
        style: maptilersdk.MapStyle.OUTDOOR,
        center: [-103.59179687498357, 40.66995747013945],
        zoom: 3,
        pitch: 40,
        bearing: -15,
    });

    // Navigation control
    map.addControl(new maptilersdk.NavigationControl({
        visualizePitch: true
    }), 'top-right');

    map.on('load', function () {
        // Add terrain for 3D effect
        map.addSource('terrain', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${maptilerApiKey}`,
            tileSize: 256
        });
        map.setTerrain({ source: 'terrain', exaggeration: 1.2 });

        map.addSource('campgrounds', {
            type: 'geojson',
            data: campgrounds,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50
        });

        map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'campgrounds',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#FF385C',
                    10,
                    '#E31C5F',
                    30,
                    '#B02A48'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    15,
                    10,
                    20,
                    30,
                    25
                ],
                'circle-opacity': 0.9,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'campgrounds',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            },
            paint: {
                'text-color': '#ffffff'
            }
        });

        map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'campgrounds',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': '#FF385C',
                'circle-radius': 6,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#fff',
                'circle-opacity': 0.9
            }
        });

        // Expand cluster on click
        map.on('click', 'clusters', async (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            const clusterId = features[0].properties.cluster_id;
            const zoom = await map.getSource('campgrounds').getClusterExpansionZoom(clusterId);
            map.easeTo({
                center: features[0].geometry.coordinates,
                zoom
            });
        });

        // Show popup on unclustered point click
        map.on('click', 'unclustered-point', function (e) {
            const { popUpMarkup } = e.features[0].properties;
            const coordinates = e.features[0].geometry.coordinates.slice();

            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            new maptilersdk.Popup()
                .setLngLat(coordinates)
                .setHTML(popUpMarkup)
                .addTo(map);
        });

        map.on('mouseenter', 'clusters', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'clusters', () => {
            map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'unclustered-point', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'unclustered-point', () => {
            map.getCanvas().style.cursor = '';
        });
    });
}