

// --- Code des étoiles (adapté de stars.js) ---

let stars = [];
const numStars = 200;

function initStars() {
    stars = [];
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: Math.random() * 0.5 + 0.2
        });
    }
}



// Récupération du canvas et contexte
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

// Création d'un canvas offscreen pour le bruit (nébuleuse)
let noiseCanvas = document.createElement('canvas');
let noiseCtx = noiseCanvas.getContext('2d');

// Fonction de redimensionnement commune
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  noiseCanvas.width = canvas.width / 2;
  noiseCanvas.height = canvas.height / 2;
  initStars(); // Recréer les étoiles pour le nouveau format
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();


// --- Code de la nébuleuse (adapté de nebuleuse.js) ---

// Initialisation du Perlin
const Perlin = {};
Perlin.p = new Array(512);
Perlin.permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,
  140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,
  26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,
  20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,
  83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,
  54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,
  130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,
  5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,
  28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,
  43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,
  246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,
  249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,
  45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,
  66,215,61,156,180];
for (let i = 0; i < 256; i++) {
  Perlin.p[256 + i] = Perlin.p[i] = Perlin.permutation[i];
}

// Fonctions d'interpolation et de gradient
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
function grad(hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}
Perlin.noise = function(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = Perlin.p[X] + Y, AA = Perlin.p[A] + Z, AB = Perlin.p[A + 1] + Z;
  const B = Perlin.p[X + 1] + Y, BA = Perlin.p[B] + Z, BB = Perlin.p[B + 1] + Z;
  return lerp(w,
    lerp(v,
      lerp(u, grad(Perlin.p[AA], x, y, z),
              grad(Perlin.p[BA], x - 1, y, z)),
      lerp(u, grad(Perlin.p[AB], x, y - 1, z),
              grad(Perlin.p[BB], x - 1, y - 1, z))
    ),
    lerp(v,
      lerp(u, grad(Perlin.p[AA + 1], x, y, z - 1),
              grad(Perlin.p[BA + 1], x - 1, y, z - 1)),
      lerp(u, grad(Perlin.p[AB + 1], x, y - 1, z - 1),
              grad(Perlin.p[BB + 1], x - 1, y - 1, z - 1))
    )
  );
};

function fractalNoise(x, y, z) {
  let total = 0, frequency = 1, amplitude = 1, maxValue = 0;
  for (let i = 0; i < 6; i++) {
    total += Perlin.noise(x * frequency, y * frequency, z) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / maxValue;
}

function getNebulaColor(n) {
  n = Math.max(0, Math.min(1, n));
  let r, g, b, a;
  if (n < 0.4) {
    const t = n / 0.4;
    r = Math.floor(5 * (1 - t) + 10 * t);
    g = Math.floor(5 * (1 - t) + 20 * t);
    b = Math.floor(20 * (1 - t) + 80 * t);
    a = Math.floor(30 * (1 - t) + 80 * t);
  } else if (n < 0.7) {
    const t = (n - 0.4) / 0.3;
    r = Math.floor(10 * (1 - t) + 100 * t);
    g = Math.floor(20 * (1 - t) + 50 * t);
    b = Math.floor(80 * (1 - t) + 180 * t);
    a = Math.floor(80 * (1 - t) + 180 * t);
  } else {
    const t = (n - 0.7) / 0.3;
    r = Math.floor(100 * (1 - t) + 255 * t);
    g = Math.floor(50 * (1 - t) + 200 * t);
    b = Math.floor(180 * (1 - t) + 255 * t);
    a = Math.floor(180 * (1 - t) + 255 * t);
  }
  return [r, g, b, a];
}

// Offsets aléatoires pour varier la nébuleuse
const noiseOffsetX = Math.random() * 1000;
const noiseOffsetY = Math.random() * 1000;
const noiseOffsetZ = Math.random() * 1000;
let time = 0;

function drawNebula() {
  const width = noiseCanvas.width;
  const height = noiseCanvas.height;
  const imageData = noiseCtx.createImageData(width, height);
  const data = imageData.data;
  const scale = 0.005;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let n = fractalNoise(x * scale + noiseOffsetX, y * scale + noiseOffsetY, time + noiseOffsetZ);
      n = (n + 1) / 2;
      n = Math.pow(n, 1.5);
      const color = getNebulaColor(n);
      const index = (y * width + x) * 4;
      data[index]     = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = color[3];
    }
  }
  noiseCtx.putImageData(imageData, 0, 0);
  // Dessin de la nébuleuse avec flou
  ctx.filter = 'blur(2px)';
  ctx.drawImage(noiseCanvas, 0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';
}




function updateStars() {
    for (let star of stars) {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    }
}

function drawStars() {
    for (let star of stars) {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, 2 * Math.PI);
        ctx.fill();
    }
}


// --- Boucle d'animation unique ---

function animate() {
    time += 0.002; // Mise à jour du temps pour la nébuleuse
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Effacer le canvas une seule fois au début
    drawNebula();   // Dessiner la nébuleuse en fond
    updateStars();  // Mettre à jour la position des étoiles
    drawStars();    // Dessiner les étoiles par-dessus
    requestAnimationFrame(animate);
}

// Initialisation et lancement
initStars();
animate();
