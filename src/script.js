import { Player } from "textalive-app-api";
import * as THREE from 'three';
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TextureLoader } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let particles;
let scene, camera, renderer, controls;
let currentLyrics = "";
let confettiSystem;
let wordMeshes = [];
let fallingWords = [];
let lastRenderTime = 0;

const player = new Player({
    app: {
        token: "GfeiLX99kNC1YEyp",
        valenceArousalEnabled: true,
        vocalAmplitudeEnabled: true,
    },
    mediaElement: document.createElement("audio"),
});

player.addListener({
    onAppReady: (app) => {
        if (!app.managed) {
            player.createFromSongUrl("https://piapro.jp/t/YW_d/20210206123357");
            console.log(player.data.song);
        }
        initializeControls();
    },
    onVideoReady: (v) => {
        document.getElementById("playBtn").disabled = false;
        document.getElementById("pauseBtn").disabled = false;
        document.getElementById("explodeBtn").disabled = false;
        document.getElementById("seekbar").max = player.video.duration;
    },
    onTimerReady() {
        initThree();
    },
    onTimeUpdate: (position) => {
        console.log("再生位置のアップデート:", position, "ミリ秒");
        if (player.video) {
            const now = player.timer.position;
            const phrase = player.video.findChar(now);
            if (phrase && phrase.text !== currentLyrics) {
                currentLyrics = phrase.text;
                addNewLyrics();
            }
            changeTextColor();
            document.getElementById("seekbar").value = now;
        }
    },
    onPlay() {
        document.getElementById("playBtn").disabled = true;
        document.getElementById("pauseBtn").disabled = false;
        console.log("再生");
    },
    onPause() {
        document.getElementById("playBtn").disabled = false;
        document.getElementById("pauseBtn").disabled = true;
        console.log("一時停止");
    },
});

function initializeControls() {
    const playBtn = document.getElementById("playBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const explodeBtn = document.getElementById("explodeBtn");
    const volumeSlider = document.getElementById("volumeSlider");
    const hamburgerMenu = document.getElementById("hamburger-menu");
    const controlsContainer = document.getElementById("controls");
    const seekbar = document.getElementById("seekbar");

    playBtn.addEventListener("click", play);
    pauseBtn.addEventListener("click", pause);
    explodeBtn.addEventListener("click", explodeText);
    volumeSlider.addEventListener("input", changeVolume);
    hamburgerMenu.addEventListener("click", () => {
        controlsContainer.classList.toggle("hidden");
    });
    seekbar.addEventListener("input", seek);
}

function play() {
    player.requestPlay().then(() => {
        console.log("再生開始");
    }).catch((e) => {
        console.log("エラー: " + e.message);
    });
}

function pause() {
    player.requestPause().then(() => {
        console.log("一時停止");
    }).catch((e) => {
        console.log("エラー: " + e.message);
    });
}

function seek() {
    const seekbar = document.getElementById("seekbar");
    player.requestMediaSeek(seekbar.value).then(() => {
        console.log("シーク位置:", seekbar.value);
    }).catch((e) => {
        console.log("エラー: " + e.message);
    });
}

function explodeText() {
    wordMeshes.forEach(mesh => {
        const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
        );
        mesh.position.add(direction);
    });

    createConfetti();
}

function createConfetti() {
    const confettiCount = 100; // パーティクルの数を減らす
    const confettiGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(confettiCount * 3);
    const colors = new Float32Array(confettiCount * 3);
    const velocities = new Float32Array(confettiCount * 3);
    const rotations = new Float32Array(confettiCount * 3);
    const color = new THREE.Color();

    for (let i = 0; i < confettiCount; i++) {
        const x = (Math.random() - 0.5) * 10;
        const y = (Math.random() - 0.5) * 10;
        const z = (Math.random() - 0.5) * 10;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        velocities[i * 3] = (Math.random() - 0.5) * 0.1;
        velocities[i * 3 + 1] = Math.random() * -0.1 - 0.05;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

        rotations[i * 3] = Math.random() * Math.PI * 2;
        rotations[i * 3 + 1] = Math.random() * Math.PI * 2;
        rotations[i * 3 + 2] = Math.random() * Math.PI * 2;

        color.setHSL(Math.random(), 1.0, 0.5);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    confettiGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    confettiGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const confettiMaterial = new THREE.PointsMaterial({ size: 0.1, vertexColors: true });
    confettiSystem = new THREE.Points(confettiGeometry, confettiMaterial);
    confettiSystem.userData.velocities = velocities;
    confettiSystem.userData.rotations = rotations;

    scene.add(confettiSystem);

    setTimeout(() => {
        scene.remove(confettiSystem);
        confettiSystem = null;
    }, 3000);
}

function updateConfetti() {
    if (!confettiSystem) return;

    const positions = confettiSystem.geometry.attributes.position.array;
    const velocities = confettiSystem.userData.velocities;
    const rotations = confettiSystem.userData.rotations;

    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i];
        positions[i + 1] += velocities[i + 1];
        positions[i + 2] += velocities[i + 2];

        velocities[i + 1] -= 0.0098;

        rotations[i] += 0.01;
        rotations[i + 1] += 0.01;
        rotations[i + 2] += 0.01;

        const scale = Math.sin(rotations[i]) * 0.3 + 0.7;
        confettiSystem.geometry.attributes.position.array[i] *= scale;
        confettiSystem.geometry.attributes.position.array[i + 1] *= scale;
    }

    confettiSystem.geometry.attributes.position.needsUpdate = true;
}

function changeVolume() {
    const volume = document.getElementById("volumeSlider").value / 100;
    player.volume = volume * 10;
}

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "low-power"
    });
    renderer.setPixelRatio(window.devicePixelRatio * 0.5);

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("container").appendChild(renderer.domElement);

    const textureLoader = new TextureLoader();
    textureLoader.load('low_res_starry_sky.jpg', function (texture) { // 低解像度のテクスチャを使用
        scene.background = texture;
    });

    camera.position.z = 5;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 100;

    particles = new THREE.Group();
    scene.add(particles);

    animate();

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onWindowResize, 100);
    });
}

function addNewLyrics() {
    if (!currentLyrics) return;
    console.log(currentLyrics);

    const words = currentLyrics.split(/\s+/);
    const fontLoader = new FontLoader();
    fontLoader.load('Zen Old Mincho Black_Regular.json', (font) => {
        words.forEach((word, index) => {
            const geometry = new TextGeometry(word, {
                font: font,
                size: 0.4,
                height: 0.1,
            });

            geometry.computeBoundingBox();
            geometry.center();

            const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const textMesh = new THREE.Mesh(geometry, material);

            textMesh.position.set(
                (Math.random() - 0.5) * 5,
                10 + index * 2,
                (Math.random() - 0.5) * 5
            );

            wordMeshes.push(textMesh);
            fallingWords.push({
                mesh: textMesh,
                speed: 0.05 + Math.random() * 0.05,
                rotationSpeed: {
                    x: (Math.random() - 0.5) * 0.02,
                    y: (Math.random() - 0.5) * 0.02,
                    z: (Math.random() - 0.5) * 0.02
                }
            });

            particles.add(textMesh);
        });
    });
}

function changeTextColor() {
    const valence = player.getValenceArousal(player.timer.position);
    const arousal = player.getValenceArousal(player.timer.position);
    console.log("valence:", valence, "arousal:", arousal);

    const color = new THREE.Color();
    color.setHSL((valence + 1) / 2, 1, (arousal + 1) / 2);
    wordMeshes.forEach(mesh => {
        mesh.material.color.set(color);
    });
}

function updateFallingWords() {
    for (let i = fallingWords.length - 1; i >= 0; i--) {
        const word = fallingWords[i];
        word.mesh.position.y -= word.speed;
        word.mesh.rotation.x += word.rotationSpeed.x;
        word.mesh.rotation.y += word.rotationSpeed.y;
        word.mesh.rotation.z += word.rotationSpeed.z;

        // 画面下部に到達した単語を削除
        if (word.mesh.position.y < -5) {
            particles.remove(word.mesh);
            fallingWords.splice(i, 1);
            disposeMesh(word.mesh);
        }
    }
}

function animate(time) {
    requestAnimationFrame(animate);

    // 一定時間ごとにレンダリングを行う
    if (time - lastRenderTime > 1000 / 30) { // 30 FPS に制限
        lastRenderTime = time;
        updateFallingWords();
        updateConfetti();
        controls.update();

        if (renderer && camera) {
            renderer.render(scene, camera);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function disposeMesh(mesh) {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(material => material.dispose());
        } else {
            mesh.material.dispose();
        }
    }
}

function cleanUpScene() {
    scene.traverse(object => {
        if (object.isMesh) {
            disposeMesh(object);
        }
    });
}

// 必要なタイミングでクリーンアップを呼び出す例
window.addEventListener('beforeunload', cleanUpScene);
