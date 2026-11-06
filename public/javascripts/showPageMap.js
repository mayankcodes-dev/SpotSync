"use strict";
/**
 * showPageMap.ts — MapTiler satellite map for the spot detail page.
 * Injected variables from EJS: maptilerApiKey (string), campground (object)
 * Compiled to: public/javascripts/showPageMap.js
 */
/**
 * showPageMap.ts — MapTiler satellite map for the spot detail page.
 * Injected variables from EJS: maptilerApiKey (string), campground (object)
 * Compiled to: public/javascripts/showPageMap.js
 */
// @ts-ignore: maptilersdk is a global loaded from CDN script tag
const _sdk = window.maptilersdk;
// @ts-ignore: injected by EJS inline script before this file loads
const _apiKey = window.maptilerApiKey || '';
// @ts-ignore: injected by EJS inline script before this file loads
const _campgroundData = window.campground;
if (typeof _sdk === 'undefined' || !_apiKey) {
    const el = document.getElementById('map');
    if (el) {
        el.innerHTML =
            '<div class="d-flex align-items-center justify-content-center h-100 text-muted small p-4 text-center">Map unavailable. Add MAPTILER_API_KEY to your environment.</div>';
    }
}
else {
    _sdk.config.apiKey = _apiKey;
    const parsedCampground = typeof _campgroundData === 'string' ? JSON.parse(_campgroundData) : _campgroundData;
    const map = new _sdk.Map({
        container: 'map',
        style: _sdk.MapStyle.SATELLITE,
        center: parsedCampground.geometry.coordinates,
        zoom: 12,
        pitch: 65,
        bearing: -30,
        terrain: true,
        terrainExaggeration: 1.5,
    });
    map.on('load', () => {
        map.addSource('terrain', {
            type: 'raster-dem',
            url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${_apiKey}`,
            tileSize: 256,
        });
        map.setTerrain({ source: 'terrain', exaggeration: 1.5 });
    });
    map.addControl(new _sdk.NavigationControl({ visualizePitch: true }), 'top-right');
    if (_sdk.TerrainControl) {
        map.addControl(new _sdk.TerrainControl({ source: 'terrain', exaggeration: 1.5 }), 'top-right');
    }
    new _sdk.Marker({ color: '#FF385C' })
        .setLngLat(parsedCampground.geometry.coordinates)
        .setPopup(new _sdk.Popup({ offset: 25 }).setHTML(`<h3 class="h6 mb-1">${parsedCampground.title}</h3><p class="mb-0 small text-muted">${parsedCampground.location}</p>`))
        .addTo(map);
}
