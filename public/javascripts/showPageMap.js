if (typeof maptilersdk === 'undefined' || !maptilerApiKey) {
    const el = document.getElementById('map');
    if (el) {
        el.innerHTML = '<div class="d-flex align-items-center justify-content-center h-100 text-muted small p-4 text-center">Map unavailable. Add MAPTILER_API_KEY to your environment.</div>';
    }
} else {
    maptilersdk.config.apiKey = maptilerApiKey;

    const parsedCampground = typeof campground === 'string' ? JSON.parse(campground) : campground;

    const map = new maptilersdk.Map({
        container: 'map',
        style: maptilersdk.MapStyle.SATELLITE,
        center: parsedCampground.geometry.coordinates,
        zoom: 12,
        pitch: 65,
        bearing: -30,
        terrain: true,
        terrainExaggeration: 1.5
    });

    map.on('load', () => {
        // Add terrain source for 3D elevation
        map.addSource('terrain', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${maptilerApiKey}`,
            tileSize: 256
        });

        map.setTerrain({ source: 'terrain', exaggeration: 1.5 });
    });

    // Navigation control (zoom + compass + tilt)
    map.addControl(new maptilersdk.NavigationControl({
        visualizePitch: true
    }), 'top-right');

    // Terrain / 3D toggle control
    if (maptilersdk.TerrainControl) {
        map.addControl(new maptilersdk.TerrainControl({
            source: 'terrain',
            exaggeration: 1.5
        }), 'top-right');
    }

    new maptilersdk.Marker({ color: '#FF385C' })
        .setLngLat(parsedCampground.geometry.coordinates)
        .setPopup(
            new maptilersdk.Popup({ offset: 25 })
                .setHTML(
                    `<h3 class="h6 mb-1">${parsedCampground.title}</h3><p class="mb-0 small text-muted">${parsedCampground.location}</p>`
                )
        )
        .addTo(map);
}