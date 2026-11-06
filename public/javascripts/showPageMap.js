"use strict";
/**
 * showPageMap.js — MapTiler satellite/terrain map for the spot detail page.
 * Injected variables from EJS inline script before this file:
 *   maptilerApiKey (string), campground (object or JSON string)
 * Also reads from window.maptilerApiKey / window.campground as fallback.
 */
/* globals maptilersdk, maptilerApiKey, campground */
var _sdk = (typeof maptilersdk !== 'undefined' ? maptilersdk : window.maptilersdk);
var _apiKey = (typeof maptilerApiKey !== 'undefined' ? maptilerApiKey : window.maptilerApiKey) || '';
var _campgroundRaw = (typeof campground !== 'undefined' ? campground : window.campground);

if (typeof _sdk === 'undefined' || !_apiKey) {
    var el = document.getElementById('map');
    if (el) {
        el.innerHTML =
            '<div class="d-flex align-items-center justify-content-center h-100 text-muted small p-4 text-center">Map unavailable. Add MAPTILER_API_KEY to your environment.</div>';
    }
} else {
    _sdk.config.apiKey = _apiKey;
    var parsedCampground = typeof _campgroundRaw === 'string' ? JSON.parse(_campgroundRaw) : _campgroundRaw;
    var map = new _sdk.Map({
        container: 'map',
        style: _sdk.MapStyle.SATELLITE,
        center: parsedCampground.geometry.coordinates,
        zoom: 12,
        pitch: 65,
        bearing: -30,
        terrain: true,
        terrainExaggeration: 1.5,
    });
    map.on('load', function() {
        map.addSource('terrain', {
            type: 'raster-dem',
            url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=' + _apiKey,
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
        .setPopup(
            new _sdk.Popup({ offset: 25 }).setHTML(
                '<h3 class="h6 mb-1">' + parsedCampground.title + '</h3><p class="mb-0 small text-muted">' + parsedCampground.location + '</p>'
            )
        )
        .addTo(map);
}
