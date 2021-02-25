import './style/main.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';

import * as dat from 'dat.gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import lightWallVertShader from './shaders/lightWallVertex.vs';
import lightWallFragShader from './shaders/lightWallFragment.fs';

Number.prototype.map = function (in_min, in_max, out_min, out_max) {
    return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

/**
 * Sizes
 */
const sizes = {}
sizes.width = window.innerWidth
sizes.height = window.innerHeight


/**
 * Environnements
 */

const gui = new dat.GUI();

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('#000000');
scene.fog = new THREE.Fog(0x000000, 0.1, 20.);

const sceneTimer = new THREE.Clock(false);
let isRunning = true;

// Camera
const cameraParams = {
    position: {
        x: 0,
        y: 0.75,
        z: 10
    }
}

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.4, 100)
camera.position.y = cameraParams.position.y;
camera.position.z = cameraParams.position.z;

scene.add(camera)

gui.add(camera, 'zoom').min(1).max(5).step(0.001).onChange((newVal) => {
    camera.zoom = newVal;
    camera.updateProjectionMatrix();
});


// Test
const cube = new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 1), new THREE.MeshNormalMaterial())
cube.position.y = -0.4;
cube.castShadow = true;
cube.layers.enable(1);
scene.add(cube)


/**
 * Scene objects
 */

const textureLoader = new THREE.TextureLoader();

const groundColorTexture = textureLoader.load('textures/ground_color.jpg');
groundColorTexture.wrapS = THREE.RepeatWrapping;
groundColorTexture.wrapT = THREE.RepeatWrapping;
groundColorTexture.repeat.set(10, 10);
groundColorTexture.minFilter = THREE.NearestFilter;
groundColorTexture.magFilter = THREE.LinearFilter;

const groundRoughnessTexture = textureLoader.load('textures/ground_roughness.jpg');
groundRoughnessTexture.wrapS = THREE.RepeatWrapping;
groundRoughnessTexture.wrapT = THREE.RepeatWrapping;
groundRoughnessTexture.repeat.set(10, 10);

const groundOcclusionTexture = textureLoader.load('textures/ground_occlusion.jpg');
groundOcclusionTexture.wrapS = THREE.RepeatWrapping;
groundOcclusionTexture.wrapT = THREE.RepeatWrapping;
groundOcclusionTexture.repeat.set(10, 10);

const groundDisplacementTexture = textureLoader.load('textures/ground_displacement.png');
groundDisplacementTexture.wrapS = THREE.RepeatWrapping;
groundDisplacementTexture.wrapT = THREE.RepeatWrapping;
groundDisplacementTexture.repeat.set(10, 10);


const groundNormalTexture = textureLoader.load('textures/ground_normal.jpg');
groundNormalTexture.wrapS = THREE.RepeatWrapping;
groundNormalTexture.wrapT = THREE.RepeatWrapping;
groundNormalTexture.repeat.set(10, 10);

// Ground
const groundPlane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(80, 40, 200, 200),
    new THREE.MeshStandardMaterial({
        map: groundColorTexture,
        roughnessMap: groundRoughnessTexture,
        aoMap: groundOcclusionTexture,
        displacementMap: groundDisplacementTexture,
        displacementScale: 0.1,
        normalMap: groundNormalTexture,
    })
);
groundPlane.geometry.setAttribute('uv2', new THREE.BufferAttribute(groundPlane.geometry.attributes.uv, 2));
groundPlane.receiveShadow = true;
groundPlane.castShadow = false;
groundPlane.rotation.x = -Math.PI * 0.5;
groundPlane.position.y = -1;
groundPlane.position.z = -2;

groundPlane.layers.enable(1);
scene.add(groundPlane);


const lightWallMaterial = new THREE.ShaderMaterial({
    vertexShader: lightWallVertShader,
    fragmentShader: lightWallFragShader,
    transparent: true,
    fog: false,
    uniforms: {
        "wallAlpha": {value: 1.0},
        "tileSize": { value: 10.0}
    },
});

const lightWall = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(80, 30, 40, 40),
    lightWallMaterial
);
lightWall.position.y = 11;
lightWall.position.z = -20.;

lightWall.layers.enable(0);
scene.add(lightWall);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
ambientLight.position.y = 3;
ambientLight.layers.enable(0);
ambientLight.layers.enable(1);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 1.);
spotLight.position.set(-1.5, 8, 3);
spotLight.distance = 16;
spotLight.angle = Math.PI / 5.;
spotLight.penumbra = 0.6;

spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
spotLight.shadow.camera.near = 0.1;
spotLight.shadow.camera.far = 100;
spotLight.shadow.camera.fov = 30;

spotLight.layers.enable(0);
spotLight.layers.enable(1);
scene.add(spotLight, spotLight.target);

// const spotLightHelper = new THREE.SpotLightHelper(spotLight);
// scene.add(spotLightHelper);

/**
 * Sounds
 */
const soundListener = new THREE.AudioListener();
camera.add(soundListener);

// audio source
const soundParams = {
    play: true,
    loop: false,
    volume: 0.5
}

const sound = new THREE.Audio(soundListener);
const analyser = new THREE.AudioAnalyser(sound, 32);
const audioLoader = new THREE.AudioLoader();

audioLoader.load('sounds/OOS_Cut.mp3', (buffer) => {
    sound.setBuffer(buffer);
    sound.setLoop(soundParams.loop);
    sound.setVolume(1.);
    sound.onEnded = () => {
        sceneTimer.stop();
        isRunning = false;
    }
    sound.play(); // should only start playing after everything else is loaded
    sceneTimer.start();
});

gui.add(soundParams, 'play').name('play / stop').onFinishChange(() => {
    !soundParams.play ? sound.stop() : sound.play();
});

gui.add(soundParams, 'loop').onFinishChange(() => {
    sound.setLoop(soundParams.loop);
    if(soundParams.loop && !sound.isPlaying) {
        soundParams.play = true;
        sound.play();
    }
});

gui.add(soundParams, 'volume').min(0.0).max(1.0).step(0.01).onFinishChange(() => {
    sound.setVolume(soundParams.volume);
});


// Controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enabled = false;
// controls.enableDamping = true;
// controls.update();


// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('.webgl'),
    antialias: true
})
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(sizes.width, sizes.height);


// post processing
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

camera.layers.toggle(0);
const bloomPass = new BloomPass(2, 20);
composer.addPass(bloomPass);

const sceneCopy = new ShaderPass(CopyShader);
camera.layers.enableAll();
sceneCopy.renderToScreen = true;
composer.addPass(sceneCopy);


/**
 * Loop
 */
const loop = () =>
{
    // Keep looping
    window.requestAnimationFrame(loop)

    if(isRunning){
        let freq = analyser.getAverageFrequency();
        let currTime = sceneTimer.getElapsedTime();
        let wholeSec = Number.parseFloat(currTime).toFixed(1);

        cameraParams.position.y = THREE.MathUtils.lerp(cameraParams.position.y, 0.25, currTime/6000.0);
        cameraParams.position.z = THREE.MathUtils.lerp(cameraParams.position.z, 5, currTime/6000.0);
        camera.position.y = cameraParams.position.y;
        camera.position.z = cameraParams.position.z;

        // camera.updateProjectionMatrix();

        if(wholeSec >= 13.5 && wholeSec < 20) {
            cube.position.y = THREE.MathUtils.lerp(cube.position.y, 1.0, currTime/6000.0);
            cube.rotation.set(
                THREE.MathUtils.lerp(cube.rotation.x, -Math.PI/5.0, currTime/8000.0),
                THREE.MathUtils.lerp(cube.rotation.y, Math.PI * 1.25, currTime/8000.0),
                THREE.MathUtils.lerp(cube.rotation.z, Math.PI * 1.5, currTime/8000.0)
            );
        } else if(wholeSec >= 20) {
            cube.rotation.y += 0.01;
            cube.rotation.z += 0.01;

            // Update
            if(currTime >= 40.5 && currTime < 40.9) {
                cube.rotation.y -= 0.05;
                cube.rotation.z += 0.05;
            } 
        }
        
        if(wholeSec < 26) {
            lightWallMaterial.uniforms.wallAlpha.value = THREE.MathUtils.mapLinear(freq, 100.0, 140.0, 0., 1.);

            if(wholeSec % 7.0 == 0.5) {
                lightWallMaterial.uniforms.tileSize.value = THREE.MathUtils.randInt(13, 20);
            }
            
        } else if(wholeSec >= 28.0 && wholeSec < 55.0 ) {
            lightWallMaterial.uniforms.wallAlpha.value = THREE.MathUtils.mapLinear(freq, 156.5, 165.0, 0., 1.);
        }
    }

    // Update controls
    // controls.update();

    // Render
    composer.render();
}
loop();


/**
 *  Listeners
 */
window.addEventListener('resize', () =>
{
    // Save sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
});

window.addEventListener('keyup', (e) => { 
    switch(e.code ) {
        case 'Space': sound.stop();
                      sound.play(0); 
                      sceneTimer.stop();
                      sceneTimer.start(); // restart
        break;
        case 'KeyH':  console.log('average freq', analyser.getAverageFrequency(), 'currtime', sceneTimer.getElapsedTime());
        break;

        default: break;
    }
})
