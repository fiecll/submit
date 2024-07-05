import { Player } from "textalive-app-api";
import * as THREE from 'three';
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { TextureLoader } from 'three';

let particles;
let scene, camera, renderer;
let currentLyrics = "";
let confettiSystem;
let wordMeshes = [];
let fallingWords = [];

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
    },
    onTimerReady() {
        initThree();
    },
    onTimeUpdate: (position) => {
        console.log("再生位置のアップデート:", position, "ミリ秒");
        if (player.video) {
            const now = player.timer.position;
            const phrase = player.video.findPhrase(now);
            if (phrase && phrase.text !== currentLyrics) {
                currentLyrics = phrase.text;
                addNewLyrics();
            }
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

    playBtn.addEventListener("click", play);
    pauseBtn.addEventListener("click", pause);
    explodeBtn.addEventListener("click", explodeText);
    volumeSlider.addEventListener("input", changeVolume);
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
    // 既存のconfetti作成コードをそのまま使用
}

function updateConfetti() {
    // 既存のconfetti更新コードをそのまま使用
}

function changeVolume() {
    const volume = document.getElementById("volumeSlider").value / 100;
    player.volume = volume * 10;
}

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({
        antialias: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById("container").appendChild(renderer.domElement);

    const textureLoader = new TextureLoader();
    textureLoader.load('starry_sky.jpg', function (texture) {
        scene.background = texture;
    });

    camera.position.z = 5;

    particles = new THREE.Group();
    scene.add(particles);

    animate();

    window.addEventListener("resize", onWindowResize);
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

function updateFallingWords() {
    fallingWords.forEach((word, index) => {
        word.mesh.position.y -= word.speed;
        word.mesh.rotation.x += word.rotationSpeed.x;
        word.mesh.rotation.y += word.rotationSpeed.y;
        word.mesh.rotation.z += word.rotationSpeed.z;

        // 画面下部に到達した単語を上に戻す
        if (word.mesh.position.y < -5) {
            word.mesh.position.y = 10;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    updateFallingWords();
    updateConfetti();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}