precision mediump float;

varying vec2 vUv;
uniform float wallAlpha;
uniform float tileSize;

float random(vec2 st)
{
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vec2 gridUv = vec2(floor(vUv * tileSize) / tileSize) * tileSize;

    float strength = step(0.5, random(gridUv));

    vec3 fogColor = vec3(0.); // grey color

    gl_FragColor = vec4(mix(vec3(strength), fogColor, 0.6), wallAlpha);
}
