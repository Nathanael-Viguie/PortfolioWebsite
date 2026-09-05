// Wind Tunnel Simulation (Streamlines Flow Effect)
const canvas = document.getElementById('streamCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particleCount = 75;
    const particles = [];

    class StreamlineParticle {
        constructor() {
            this.reset();
            this.x = Math.random() * width; // Randomize start positions
        }

        reset() {
            this.x = 0;
            this.y = Math.random() * height;
            this.speed = 2 + Math.random() * 4;
            this.amplitude = 15 + Math.random() * 30;
            this.frequency = 0.003 + Math.random() * 0.003;
            this.length = 40 + Math.random() * 80;
            this.alpha = 0.07 + Math.random() * 0.15; // Subtle streamline trace
        }

        update() {
            this.x += this.speed;
            
            // Aerodynamic deflection around an invisible airfoil object at center (Venturi effect simulator)
            let deflection = 0;
            const centerX = width / 2;
            const centerY = height / 2;
            const distToCenter = Math.hypot(this.x - centerX, this.y - centerY);
            
            if (distToCenter < 250) {
                deflection = Math.sin((this.x - centerX) * 0.02) * (180 / (distToCenter * 0.05 + 1));
            }

            this.currentY = this.y + Math.sin(this.x * this.frequency) * this.amplitude - deflection;

            if (this.x > width) {
                this.reset();
            }
        }

        draw() {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(197, 160, 89, ${this.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.moveTo(this.x - this.length, this.currentY);
            ctx.lineTo(this.x, this.currentY);
            ctx.stroke();
        }
    }

    for (let i = 0; i < particleCount; i++) {
        particles.push(new StreamlineParticle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    
    animate();
}
