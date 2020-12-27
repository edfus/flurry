const map = new Map();

function debounce (key, cb, tolerance) {
    if(map.has(key)) {
        clearTimeout(map.get(key));
    }
    map.set(key, setTimeout(() => map.delete(key) && cb(), tolerance))
}

export default debounce;