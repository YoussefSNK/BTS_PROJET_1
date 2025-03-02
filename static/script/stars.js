const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let stars = [];
const numStars = 200;
let time = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function initStars() {
    resizeCanvas();
    stars = [];
    for (let i = 0; i < numStars; i++) {
        let speed = Math.random() * 0.5 + 0.2;
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2,
            speed: speed,
            phase: Math.random() * Math.PI * 2,
            frequency: speed * 1 // paramètre changeable
        });
    }
}

function animateStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    time += 0.02;

    for (let star of stars) {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }

        let opacity = 0.5 + 0.5 * Math.sin(time * star.frequency + star.phase);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, 2 * Math.PI);
        ctx.fill();
    }

    requestAnimationFrame(animateStars);
}


window.addEventListener('resize', resizeCanvas);
window.addEventListener('scroll', resizeCanvas);

initStars();
animateStars();