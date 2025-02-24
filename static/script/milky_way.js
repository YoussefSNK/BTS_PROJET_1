const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

let stars = [];
const numStars = 1000;
let angle = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
}

function initStars() {
    stars = [];
    for (let i = 0; i < numStars; i++) {
        let radius = Math.random() * (canvas.width / 3);
        let theta = Math.random() * Math.PI * 2;
        let size = Math.random() * 2.5;
        let speed = (radius / canvas.width) * 0.02;

        stars.push({
            x: canvas.width / 2 + radius * Math.cos(theta),
            y: canvas.height / 2 + radius * Math.sin(theta),
            radius,
            theta,
            size,
            speed,
            color: `rgba(${255 - radius / 3}, ${200 - radius / 4}, 255, ${Math.random()})`
        });
    }
}

function animateStars() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    angle += 0.001;
    
    for (let star of stars) {
        star.theta += star.speed;
        let x = canvas.width / 2 + star.radius * Math.cos(star.theta + angle);
        let y = canvas.height / 2 + star.radius * Math.sin(star.theta + angle);
        
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, 2 * Math.PI);
        ctx.fill();
    }

    requestAnimationFrame(animateStars);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
animateStars();
