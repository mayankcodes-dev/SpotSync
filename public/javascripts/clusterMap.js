"use strict";
/**
 * clusterMap.js — MapTiler cluster map for the spots index page.
 * Injected variables from EJS inline script before this file:
 *   maptilerApiKey (string), campgrounds (GeoJSON FeatureCollection)
 * Also reads from window.maptilerApiKey / window.campgrounds as fallback.
 */
/* globals maptilersdk, maptilerApiKey, campgrounds */
// Read from inline script const OR window.* assignment (whichever the EJS uses)
var _maptilersdk = (typeof maptilersdk !== 'undefined' ? maptilersdk : window.maptilersdk);
var _maptilerApiKey = (typeof maptilerApiKey !== 'undefined' ? maptilerApiKey : window.maptilerApiKey) || '';
var _campgrounds = (typeof campgrounds !== 'undefined' ? campgrounds : window.campgrounds);

if (typeof _maptilersdk === 'undefined' || !_maptilerApiKey) {
    var el = document.getElementById('cluster-map');
    if (el) {
        el.innerHTML =
            '<div class="d-flex align-items-center justify-content-center h-100 text-muted small p-4 text-center">Map unavailable. Add a valid MAPTILER_API_KEY in your environment to show the cluster map.</div>';
    }
} else {
    _maptilersdk.config.apiKey = _maptilerApiKey;
    var map = new _maptilersdk.Map({
        container: 'cluster-map',
        style: _maptilersdk.MapStyle.OUTDOOR,
        center: [-103.59179687498357, 40.66995747013945],
        zoom: 3,
        pitch: 40,
        bearing: -15,
    });
    map.addControl(new _maptilersdk.NavigationControl({ visualizePitch: true }), 'top-right');
    map.on('load', function() {
        map.addSource('terrain', {
            type: 'raster-dem',
            url: 'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=' + _maptilerApiKey,
            tileSize: 256,
        });
        map.setTerrain({ source: 'terrain', exaggeration: 1.2 });
        map.addSource('campgrounds', {
            type: 'geojson',
            data: _campgrounds,
            cluster: true,
            clusterMaxZoom: 14,
            clusterRadius: 50,
        });
        map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'campgrounds',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': ['step', ['get', 'point_count'], '#FF385C', 10, '#E31C5F', 30, '#B02A48'],
                'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 30, 25],
                'circle-opacity': 0.9,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
            },
        });
        map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'campgrounds',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12,
            },
            paint: { 'text-color': '#ffffff' },
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
                'circle-opacity': 0.9,
            },
        });
        map.on('click', 'clusters', function(e) {
            var features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
            var clusterId = features[0].properties.cluster_id;
            map.getSource('campgrounds').getClusterExpansionZoom(clusterId).then(function(zoom) {
                map.easeTo({ center: features[0].geometry.coordinates, zoom: zoom });
            });
        });
        map.on('click', 'unclustered-point', function(e) {
            var popUpMarkup = e.features[0].properties.popUpMarkup;
            var coordinates = e.features[0].geometry.coordinates.slice();
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
            new _maptilersdk.Popup().setLngLat(coordinates).setHTML(popUpMarkup).addTo(map);
        });
        function setCursor(cursor) { return function() { map.getCanvas().style.cursor = cursor; }; }
        map.on('mouseenter', 'clusters', setCursor('pointer'));
        map.on('mouseleave', 'clusters', setCursor(''));
        map.on('mouseenter', 'unclustered-point', setCursor('pointer'));
        map.on('mouseleave', 'unclustered-point', setCursor(''));
    });
}
