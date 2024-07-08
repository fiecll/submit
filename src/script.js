import { Player } from "textalive-app-api";
import * as THREE from 'three';
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let particles;   //テキストパーティクル
let scene, camera, renderer, controls;
let currentLyrics = "";
let confettiSystem; //花吹雪
let wordMeshes = [];
let wordTrails = [];

const MAX_TRAIL_LENGTH = 100; // 軌跡の最大長さを増やす
let lastRenderTime = 0;
let geometries = {};
let wordPool = [];
let cachedFont = null;
let isSphericalMode = false;
let selectedSongUrl = "";
let selectedSongKey = "";


const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const startButton = document.getElementById("startButton");
const songSelect = document.getElementById("songSelect");
const overlay = document.querySelector("#overlay");

overlay.className = "disabled";

startButton.addEventListener("click", () => {
    selectedSongUrl = songSelect.value;
    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("mainApp").classList.remove("hidden");
    overlay.className = "abled";
    player.createFromSongUrl(selectedSongUrl);
});

const songOptions = {
    hZ35: {
        url: "https://piapro.jp/t/hZ35/20240130103028",
        video: {
            beatId: 4592293,
            chordId: 2727635,
            repetitiveSegmentId: 2824326,
            lyricId: 59415,
            lyricDiffId: 13962
        }
    },
    "--OD": {
        url: "https://piapro.jp/t/--OD/20240202150903",
        video: {
            beatId: 4592296,
            chordId: 2727636,
            repetitiveSegmentId: 2824327,
            lyricId: 59416,
            lyricDiffId: 13963
        }
    },
    XiaI: {
        url: "https://piapro.jp/t/XiaI/20240201203346",
        video: {
            beatId: 4592297,
            chordId: 2727637,
            repetitiveSegmentId: 2824328,
            lyricId: 59417,
            lyricDiffId: 13964
        }
    },
    Rejk: {
        url: "https://piapro.jp/t/Rejk/20240202164429",
        video: {
            beatId: 4592298,
            chordId: 2727638,
            repetitiveSegmentId: 2824329,
            lyricId: 59418,
            lyricDiffId: 13965
        }
    },
    ELIC: {
        url: "https://piapro.jp/t/ELIC/20240130010349",
        video: {
            beatId: 4592299,
            chordId: 2727639,
            repetitiveSegmentId: 2824330,
            lyricId: 59419,
            lyricDiffId: 13966
        }
    },
    xEA7: {
        url: "https://piapro.jp/t/xEA7/20240202002556",
        video: {
            beatId: 4592300,
            chordId: 2727640,
            repetitiveSegmentId: 2824331,
            lyricId: 59420,
            lyricDiffId: 13967
        }
    }
};

const player = new Player({
    app: {
        token: "GfeiLX99kNC1YEyp",
    },
    valenceArousalEnabled: true,
    vocalAmplitudeEnabled: true,
    mediaElement: document.createElement("audio"),
});

player.addListener({
    onAppReady: (app) => {
        if (!app.managed) {
            //player.createFromSongUrl("https://piapro.jp/t/YW_d/20210206123357");
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
        overlay.className = "disabled";
    },
    onTimeUpdate: (position) => {
        if (player.video) {
            const now = player.timer.position;
            const phrase = player.video.findChar(now);
            const nowphrase = player.video.findPhrase(now);
            if (phrase && phrase.text !== currentLyrics) {
                currentLyrics = phrase.text;
                debouncedAddNewLyrics();
                updateCurrentLyricsDisplay(nowphrase.text); 
            }
            changeTextColor();
            document.getElementById("seekbar").value = now;
        }
    },
    onPlay() {
        document.getElementById("playBtn").disabled = true;
        document.getElementById("pauseBtn").disabled = false;
    },
    onPause() {
        document.getElementById("playBtn").disabled = false;
        document.getElementById("pauseBtn").disabled = true;
    },
});

startButton.addEventListener("click", () => {
    selectedSongKey = songSelect.value;
    const selectedSong = songOptions[selectedSongKey];
    if (selectedSong) {
        document.getElementById("startScreen").classList.add("hidden");
        document.getElementById("mainApp").classList.remove("hidden");
        player.createFromSongUrl(selectedSong.url, {
            video: selectedSong.video
        });
    }
});

function preloadFont() {
    const fontLoader = new FontLoader();
    fontLoader.load('Zen Old Mincho Black_Regular.json', (font) => {
        cachedFont = font;
    });
}

preloadFont();

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
    volumeSlider.addEventListener("input", changeVolume);
    hamburgerMenu.addEventListener("click", () => {
        controlsContainer.classList.toggle("hidden");
    });
    seekbar.addEventListener("input", seek);

    let touchStartTime;
    explodeBtn.addEventListener("touchstart", () => {
        touchStartTime = Date.now();
    });
    explodeBtn.addEventListener("touchend", () => {
        if (Date.now() - touchStartTime < 300) {
            explodeText();
        }
    });
    explodeBtn.addEventListener("click", explodeText);

    const startButton = document.getElementById("startButton");
    startButton.addEventListener("click", () => {
        document.getElementById("startScreen").classList.add("hidden");
        document.getElementById("mainApp").classList.remove("hidden");
    });

    const modeToggleBtn = document.createElement('button');
    modeToggleBtn.textContent = '球面モード切替';
    modeToggleBtn.addEventListener('click', toggleSphericalMode);
    document.getElementById('controls').appendChild(modeToggleBtn);
}

function toggleSphericalMode() {
    isSphericalMode = !isSphericalMode;
    clearExistingLyrics();
}

function play() {
    player.requestPlay();
}

function pause() {
    player.requestPause();
}

function seek() {
    const seekbar = document.getElementById("seekbar");
    player.requestMediaSeek(seekbar.value);
}

function changeVolume() {
    const volumeSlider = document.getElementById("volumeSlider");
    const volume = volumeSlider.value / 100;
    player.volume = volume * 100;
    console.log("Player media element volume:", player.mediaElement.volume);
}

function updateCurrentLyricsDisplay(lyrics) {
    const lyricsElement = document.getElementById('currentLyrics');
    lyricsElement.textContent = lyrics;
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


function clearExistingLyrics() {
    wordTrails.forEach(word => {
        particles.remove(word.mesh);
        scene.remove(word.trail);
    });
    wordTrails = [];
}

function createConfetti() {
    const confettiCount = isMobile ? 50 : 100;
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
        confettiSystem.geometry.dispose();
        confettiSystem.material.dispose();
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

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // カメラの初期位置を調整
    camera.position.set(0, 0, 30);

    renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "low-power"
    });

    if (isMobile) {
        renderer.setPixelRatio(1);
    } else {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("container").appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('starry_sky.jpg', function (texture) {
        texture.minFilter = THREE.LinearFilter;
        scene.background = texture;
    });

        // 背景を黒に設定
    scene.background = new THREE.Color(0x000000);

    camera.position.z = 5;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 1;
    controls.maxDistance = 100;

    particles = new THREE.Group();
    scene.add(particles);

    // // 床を追加
    // const floorGeometry = new THREE.PlaneGeometry(10, 10);
    // const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    // const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    // floor.rotation.x = -Math.PI / 2;
    // floor.position.y = -5;
    // scene.add(floor);

    // // 格子の座標軸を追加
    // const gridSize = 10;
    // const gridDivisions = 10;
    // const gridHelperXZ = new THREE.GridHelper(gridSize, gridDivisions, 0x00ff00, 0x004400);
    // gridHelperXZ.position.y = -5;
    // scene.add(gridHelperXZ);

    // const gridHelperXY = new THREE.GridHelper(gridSize, gridDivisions, 0x00ff00, 0x004400);
    // gridHelperXY.rotation.x = Math.PI / 2;
    // gridHelperXY.position.z = -5;
    // scene.add(gridHelperXY);

    // const gridHelperYZ = new THREE.GridHelper(gridSize, gridDivisions, 0x00ff00, 0x004400);
    // gridHelperYZ.rotation.z = Math.PI / 2;
    // gridHelperYZ.position.x = -5;
    // scene.add(gridHelperYZ);

    
    // プラネタリウムのような球体を作成
    createPlanetariumSphere();

    animate();

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(onWindowResize, 100);
    });
}

function createPlanetariumSphere() {
    const radius = 50;
    const segments = 64;
    const rings = 64;

    // 球体のジオメトリを作成
    const sphereGeometry = new THREE.SphereGeometry(radius, segments, rings);
    
    // 星のテクスチャを作成
    const starTexture = createStarTexture();
    
    // 球体のマテリアルを作成
    const sphereMaterial = new THREE.MeshBasicMaterial({
        map: starTexture,
        side: THREE.BackSide, // 内側から見えるようにする
        transparent: true,
        opacity: 0.8
    });

    // 球体メッシュを作成し、シーンに追加
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphereMesh);
}

function createStarTexture() {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 背景を黒に設定
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, size, size);

    // ランダムな星を描画
    for (let i = 0; i < 1000; i++) {
        const radius = Math.random() * 2;
        const x = Math.random() * size;
        const y = Math.random() * size;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    // テクスチャを作成
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function addNewLyrics() {
    if (!currentLyrics || !cachedFont) return;

    const maxWords = isMobile ? 3 : 5;
    const words = currentLyrics.split(/\s+/).slice(0, maxWords);
    words.forEach((word, index) => {
        if (!geometries[word]) {
            geometries[word] = new TextGeometry(word, {
                font: cachedFont,
                size: 2,
                height: 0.5,
            });
            geometries[word].center();
        }

        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const textMesh = getWordMesh(word, material);

        if (isSphericalMode) {
            const sphericalPosition = getRandomSphericalPosition(95); // 球体の半径より少し小さい値
            textMesh.position.copy(sphericalPosition);
            textMesh.lookAt(new THREE.Vector3(0, 0, 0)); // 中心を向くように回転
        } else {
            textMesh.position.set(
                (Math.random() - 0.5) * 40,
                20 + index * 5,
                (Math.random() - 0.5) * 40
            );
        }

    

        const trailColor = new THREE.Color().setHSL(Math.random(), 1, 0.5);
        const trail = new THREE.Line(
            new THREE.BufferGeometry(),
            new THREE.LineBasicMaterial({ 
                color: trailColor,
                transparent: true,
                linewidth: 3,
            })
        );
        trail.geometry.setFromPoints([textMesh.position.clone()]);
        scene.add(trail);

        wordTrails.push({
            mesh: textMesh,
            trail: trail,
            positions: [textMesh.position.clone()],
            opacities: [1],
            speed: 0.05 + Math.random() * 0.05,
            rotationSpeed: {
                x: (Math.random() - 0.5) * 0.02,
                y: (Math.random() - 0.5) * 0.02,
                z: (Math.random() - 0.5) * 0.02
            },
            sphericalPosition: isSphericalMode ? getRandomSphericalCoordinates() : null
        });

        particles.add(textMesh);
    });
}

function getRandomSphericalPosition(radius) {
    const theta = Math.random() * Math.PI * 2; // 0 to 2π
    const phi = Math.acos(2 * Math.random() - 1); // 0 to π
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

function getRandomSphericalCoordinates() {
    return {
        theta: Math.random() * Math.PI * 2,
        phi: Math.acos(2 * Math.random() - 1)
    };
}

function getWordMesh(word, material) {
    if (wordPool.length > 0) {
        const mesh = wordPool.pop();
        mesh.geometry = geometries[word];
        mesh.material = material;
        return mesh;
    }
    return new THREE.Mesh(geometries[word], material);
}

function releaseWordMesh(mesh) {
    if (wordPool.length < 50) {
        wordPool.push(mesh);
    } else {
        disposeMesh(mesh);
    }
}

function changeTextColor() {
    const position = player.timer.position;
    if (!position) {
        console.error("プレイヤーの位置が無効です。");
        return;
    }

    // 感情値を取得
    const valenceArousal = player.getValenceArousal(position);
    if (!valenceArousal) {
        console.error("感情値の取得に失敗しました。");
        return;
    }

    const valence = valenceArousal.v;
    const arousal = valenceArousal.a;

    if (valence === undefined || arousal === undefined) {
        console.error("感情値が未定義です。");
        return;
    }

    console.log(`Valence: ${valence}, Arousal: ${arousal}`);

    const color = new THREE.Color();
    console.log(color);
    color.setHSL((valence + 1) / 2, 1, (arousal + 1) / 2);
    // wordMeshes.forEach(mesh => {
    //     mesh.material.color.set(color);
    // });
    return color; // 色を返す
}

function updateFallingWords() {
    const currentColor = changeTextColor(); // 現在の感情値に基づく色を取得

    for (let i = wordTrails.length - 1; i >= 0; i--) {
        const word = wordTrails[i];

        // 文字の色を更新
        word.mesh.material.color.copy(currentColor);

        if (isSphericalMode) {
            // 球面上を移動
            word.sphericalPosition.theta += 0.005;
            word.sphericalPosition.phi += 0.002;
            const newPosition = new THREE.Vector3(
                95 * Math.sin(word.sphericalPosition.phi) * Math.cos(word.sphericalPosition.theta),
                95 * Math.sin(word.sphericalPosition.phi) * Math.sin(word.sphericalPosition.theta),
                95 * Math.cos(word.sphericalPosition.phi)
            );
            word.mesh.position.copy(newPosition);
            word.mesh.lookAt(new THREE.Vector3(0, 0, 0));
        } else {
            // 通常の落下モード
            word.mesh.position.y -= word.speed;
            word.mesh.rotation.x += word.rotationSpeed.x;
            word.mesh.rotation.y += word.rotationSpeed.y;
            word.mesh.rotation.z += word.rotationSpeed.z;
        }

        // 軌跡を更新
        word.positions.push(word.mesh.position.clone());
        word.opacities.push(1);

        if (word.positions.length > MAX_TRAIL_LENGTH) {
            word.positions.shift();
            word.opacities.shift();
        }

        // 不透明度を徐々に下げる
        for (let j = 0; j < word.opacities.length; j++) {
            word.opacities[j] *= 0.99;
        }

        // 軌跡の geometry と material を更新
        const geometry = new THREE.BufferGeometry().setFromPoints(word.positions);
        const material = word.trail.material.clone();
        material.color.copy(currentColor); // 軌跡の色も更新
        material.opacity = 1;

        const colors = new Float32Array(word.positions.length * 3);
        for (let j = 0; j < word.positions.length; j++) {
            const color = new THREE.Color(material.color);
            color.multiplyScalar(word.opacities[j]);
            colors[j * 3] = color.r;
            colors[j * 3 + 1] = color.g;
            colors[j * 3 + 2] = color.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        material.vertexColors = true;

        scene.remove(word.trail);
        word.trail = new THREE.Line(geometry, material);
        scene.add(word.trail);

        // 球面モードでは削除条件を変更
        if ((!isSphericalMode && word.mesh.position.y < -50) || 
            (isSphericalMode && word.opacities[0] < 0.01)) {
            particles.remove(word.mesh);
            scene.remove(word.trail);
            wordTrails.splice(i, 1);
            releaseWordMesh(word.mesh);
        }
    }
}

function animate(time) {
    requestAnimationFrame(animate);

    if (time - lastRenderTime > 1000 / (isMobile ? 20 : 30)) {
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
    wordMeshes.forEach(mesh => {
        disposeMesh(mesh);
    });
    wordMeshes = [];
    
    wordTrails.forEach(word => {
        scene.remove(word.trail);
        word.trail.geometry.dispose();
        word.trail.material.dispose();
    });
    wordTrails = [];
    
    if (confettiSystem) {
        scene.remove(confettiSystem);
        confettiSystem.geometry.dispose();
        confettiSystem.material.dispose();
        confettiSystem = null;
    }
    Object.values(geometries).forEach(geometry => geometry.dispose());
    geometries = {};
    wordPool.forEach(mesh => disposeMesh(mesh));
    wordPool = [];
}

window.addEventListener('beforeunload', cleanUpScene);

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedAddNewLyrics = debounce(addNewLyrics, 300);