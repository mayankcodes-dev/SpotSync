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
    style: maptilersdk.MapStyle.BRIGHT,
    center: parsedCampground.geometry.coordinates, // starting position [lng, lat]
    zoom: 10 // starting zoom
});

new maptilersdk.Marker()
    .setLngLat(parsedCampground.geometry.coordinates)
    .setPopup(
        new maptilersdk.Popup({ offset: 25 })
            .setHTML(
                `<h3 class="h6 mb-1">${parsedCampground.title}</h3><p class="mb-0 small text-muted">${parsedCampground.location}</p>`
            )
    )
    .addTo(map);
}