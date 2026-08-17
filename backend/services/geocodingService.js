/**
 * Geocoding Service using OpenStreetMap Nominatim API
 * 
 * Nominatim Usage Policy:
 * - Max 1 request per second
 * - Must provide a valid User-Agent
 * - Results should be cached/stored (which we do in MongoDB)
 */

export const geocodeAddress = async (city, postalCode) => {
    try {
        const query = encodeURIComponent(`${city}, ${postalCode}`);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
        
        // Timeout setup (5 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'BloodLinkApp/1.0 (contact@bloodlink.local) Node.js'
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`Geocoding failed with status: ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        if (data && data.length > 0) {
            // Nominatim returns string coordinates, we need numbers
            return {
                longitude: parseFloat(data[0].lon),
                latitude: parseFloat(data[0].lat)
            };
        }
        
        // Address not found
        return null;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Geocoding request timed out');
        } else {
            console.error('Geocoding error:', error.message);
        }
        return null;
    }
};
